import sys
import os
import io
import json
import time
import asyncio
import base64
import re
import subprocess
import tempfile
from typing import Optional, List, Dict, Any

# Load .env file if present (for local dev with OPENAI_API_KEY etc.)
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv not installed; rely on environment

_server_dir = os.path.dirname(os.path.abspath(__file__))
_default_standalone = os.path.normpath(os.path.join(_server_dir, '..', '..', 'standalone'))
_standalone_path = os.environ.get('RAPCLOUDS_STANDALONE_DIR', _default_standalone)
if _standalone_path not in sys.path:
    sys.path.insert(0, _standalone_path)

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, ConfigDict, Field
from PIL import Image
import numpy as np
from wordcloud import WordCloud

# Optional: only needed for word cloud generation
try:
    from generate_layers_v7 import (
        extract_phrases_v7,
        build_phrase_freq_dict,
        kmeans_numpy,
        create_cluster_mask,
        make_color_func,
        rasterize_occupancy,
        merge_small_clusters,
        clean_lyrics,
        load_all_lyrics,
    )
    WORDCLOUD_AVAILABLE = True
except ImportError:
    WORDCLOUD_AVAILABLE = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Static file mounts ────────────────────────────────────────────
from starlette.staticfiles import StaticFiles

_songs_dir = os.environ.get(
    "KARAOKE_SONGS_DIR",
    os.path.expanduser("~/workspace/karaoke-mvp/songs"),
)
if os.path.isdir(_songs_dir):
    app.mount("/songs", StaticFiles(directory=_songs_dir), name="songs")

# ─── Word Cloud Config ──────────────────────────────────────────────
STANDALONE = _standalone_path
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')
MASKS_DIR = os.environ.get('RAPCLOUDS_MASKS_DIR', os.path.join(STANDALONE, 'masks'))
LYRICS_DIR = os.environ.get('RAPCLOUDS_LYRICS_DIR', os.path.join(STANDALONE, 'lyrics'))
GALLERY_DIR = os.environ.get('RAPCLOUDS_GALLERY_DIR', os.path.join(STANDALONE, 'output_v7_batch'))
DEFAULT_FONT = os.environ.get(
    'RAPCLOUDS_DEFAULT_FONT',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
)

# ─── Karaoke Config ─────────────────────────────────────────────────
SONGS_DIR = os.environ.get(
    "KARAOKE_SONGS_DIR",
    os.path.expanduser("~/workspace/karaoke-mvp/songs"),
)
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
WHISPER_API = "https://api.openai.com/v1/audio/transcriptions"


# ═══════════════════════════════════════════════════════════════════════
#  Pydantic Models
# ═══════════════════════════════════════════════════════════════════════

def _to_camel(name: str) -> str:
    """Convert snake_case field name to camelCase for frontend compatibility."""
    parts = name.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])


class GenerateRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,   # accept snake_case too
    )

    mask_path: str
    lyrics_text: Optional[str] = None
    lyrics_dir: Optional[str] = None
    font: str = DEFAULT_FONT
    width: int = 1200
    height: Optional[int] = None
    clusters: int = 7
    max_words: int = 3000
    margin: int = 1
    prefer_horizontal: float = Field(default=1.0, alias='horizontalRatio')
    relative_scaling: float = 0.0
    repeat: bool = Field(default=False, alias='repeatWords')
    min_phrase_count: int = 3
    min_phrase_words: int = 3
    max_phrase_words: int = 6
    phrase_boost: float = 4.0
    dark_bg: bool = True
    include_numbers: bool = False
    threshold: int = 50


class PrepareRequest(BaseModel):
    url: str
    lyrics: Optional[str] = None


class GradeRequest(BaseModel):
    audio: str  # base64-encoded webm
    clip_start: Optional[float] = None
    clip_end: Optional[float] = None


class UpdateTextRequest(BaseModel):
    text: str


class UpdateTimingRequest(BaseModel):
    words: List[Dict[str, Any]]


class SongMeta(BaseModel):
    name: str
    audio: str
    words: int
    segments: int
    duration: float
    youtube_url: str


class GradeResult(BaseModel):
    grade: str
    accuracy: float
    timing: float
    score: int
    max: int
    correct: int
    partial: int
    missed: int
    total_words: int
    total_attempted: int
    user_words: int
    flow_recoveries: int
    details: List[Dict[str, Any]]
    segments: List[Dict[str, Any]]
    song: Optional[str] = None
    timestamp: Optional[str] = None
    clip_start: Optional[float] = None
    clip_end: Optional[float] = None


# ═══════════════════════════════════════════════════════════════════════
#  Karaoke Helper Functions (ported from karaoke-mvp/server.py)
# ═══════════════════════════════════════════════════════════════════════

def openai_transcribe(audio_path: str, prompt: str = "") -> dict:
    """Transcribe audio using OpenAI Whisper API."""
    import requests as _requests

    if not OPENAI_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")

    headers = {"Authorization": f"Bearer {OPENAI_KEY}"}
    with open(audio_path, "rb") as f:
        files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
        data = {
            "model": "whisper-1",
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
            "language": "en",
        }
        if prompt:
            data["prompt"] = prompt
        resp = _requests.post(WHISPER_API, headers=headers, files=files, data=data, timeout=30)

    if resp.status_code != 200:
        raise RuntimeError(f"Whisper API error {resp.status_code}: {resp.text[:300]}")

    return resp.json()


def normalize(w: str) -> str:
    """Normalize a word for comparison (lowercase, strip punctuation)."""
    return re.sub(r'[^\w]', '', w.lower().strip())


def detect_sections_llm(words: list, full_text: str) -> list:
    """Use OpenAI to label song sections (intro/verse/chorus/bridge/outro)."""
    if not OPENAI_KEY or not words:
        return []

    import requests as _requests

    # Group words into ~10s chunks
    chunks = []
    chunk_start = words[0]["start"]
    chunk_words = []
    for w in words:
        chunk_words.append(w["word"])
        if w["end"] - chunk_start >= 10 or w == words[-1]:
            chunks.append({
                "t": f"{chunk_start:.0f}-{w['end']:.0f}",
                "text": " ".join(chunk_words),
            })
            chunk_start = w["end"]
            chunk_words = []

    chunks_json = json.dumps(chunks, indent=1)

    prompt = f"""Analyze this song and divide it into sections (intro, verse, chorus, bridge, outro).

LYRICS:
{full_text}

TIMED CHUNKS (start_end: words):
{chunks_json}

Return a JSON array of section objects. Each section covers one or more consecutive chunks.
Use ONLY these labels: "intro", "verse", "chorus", "bridge", "outro".

Return ONLY valid JSON array, no markdown:
[{{"label": "intro", "start": 0.0, "end": 22.0}}, {{"label": "verse", "start": 22.0, "end": 65.0}}, ...]

Rules:
- intro: short opening before first verse (instrumental, ad-libs, repeated hook)
- verse: main lyrical content (rap verses, storytelling)
- chorus: repeated section with the hook/refrain
- bridge: contrasting section between verses/chorus
- outro: closing section (repeated hook, fade-out, ad-libs)
- start/end must be in seconds, matching the chunk timestamps
- cover the ENTIRE song from first chunk to last"""

    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    try:
        resp = _requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2000,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            print(f"LLM section detection failed: {resp.status_code}")
            return []
        content = resp.json()["choices"][0]["message"]["content"]
        match = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
        text = match.group(1) if match else content.strip()
        sections = json.loads(text)
        print(f"LLM detected {len(sections)} sections")
        return sections
    except Exception as e:
        print(f"Section detection error: {e}")
        return []


def find_best_segments(gt_words: list, clip_seconds: int = 15) -> list:
    """Find the best 15-second segments to practice (densest lyrics)."""
    if not gt_words:
        return []

    duration = gt_words[-1]["end"]
    step = 5
    candidates = []

    for start_t in range(0, int(duration) - clip_seconds, step):
        end_t = start_t + clip_seconds
        words_in_clip = [w for w in gt_words if w["start"] >= start_t and w["end"] <= end_t]
        if len(words_in_clip) >= 5:
            candidates.append({
                "start": start_t,
                "end": end_t,
                "word_count": len(words_in_clip),
                "preview": " ".join(w["word"] for w in words_in_clip[:8]) + "...",
            })

    candidates.sort(key=lambda c: c["start"])
    return candidates


def prepare_song(youtube_url: str, song_name: str, lyrics_text: str = None) -> dict:
    """Download + transcribe a song."""
    song_dir = os.path.join(SONGS_DIR, song_name)
    os.makedirs(song_dir, exist_ok=True)

    # 1. Download audio
    audio_path = os.path.join(song_dir, f"{song_name}.mp3")
    if not os.path.exists(audio_path):
        ytdlp = os.environ.get("YTDLP_PATH", "yt-dlp")
        cmd = [
            ytdlp, "--extract-audio", "--audio-format", "mp3",
            "--audio-quality", "0", "--no-playlist",
            "-o", os.path.join(song_dir, f"{song_name}.%(ext)s"),
            youtube_url,
        ]
        print(f"Downloading {youtube_url}...")
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            return {"error": f"yt-dlp failed: {r.stderr[:300]}"}

    mp3s = [f for f in os.listdir(song_dir) if f.endswith(".mp3")]
    if not mp3s:
        return {"error": "No mp3 found after download"}
    audio_path = os.path.join(song_dir, mp3s[0])

    # 2. Convert to 16kHz mono WAV for Whisper API
    wav_path = os.path.join(song_dir, f"{song_name}.wav")
    if not os.path.exists(wav_path):
        subprocess.run([
            "ffmpeg", "-i", audio_path,
            "-ar", "16000", "-ac", "1",
            wav_path, "-y"
        ], capture_output=True, timeout=60)

    # 3. Transcribe via OpenAI Whisper API
    print(f"Transcribing {os.path.basename(audio_path)} via OpenAI Whisper API...")
    result = openai_transcribe(wav_path)

    # 4. Extract word-level timestamps
    words = []
    for w in result.get("words", []):
        word_text = w["word"].strip()
        if not word_text or any(ord(c) > 0xFFFF for c in word_text):
            continue
        words.append({
            "word": word_text,
            "start": round(w["start"], 3),
            "end": round(w["end"], 3),
        })

    # 5. Extract segments
    segments = []
    for s in result.get("segments", []):
        segments.append({
            "id": s["id"],
            "start": round(s["start"], 3),
            "end": round(s["end"], 3),
            "text": s["text"].strip(),
        })

    ground_truth = {
        "text": result.get("text", ""),
        "words": words,
        "segments": segments,
    }

    # 6. Save
    gt_path = os.path.join(song_dir, "ground_truth.json")
    with open(gt_path, "w") as f:
        json.dump(ground_truth, f, indent=2)

    duration = words[-1]["end"] if words else 0
    meta = {
        "name": song_name,
        "audio": os.path.basename(audio_path),
        "words": len(words),
        "segments": len(segments),
        "duration": duration,
        "youtube_url": youtube_url,
    }
    meta_path = os.path.join(song_dir, "metadata.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    # 7. Detect sections via LLM
    sections = detect_sections_llm(words, result.get("text", ""))
    if sections:
        sections_path = os.path.join(song_dir, "sections.json")
        with open(sections_path, "w") as f:
            json.dump(sections, f, indent=2)
        print(f"Sections: {len(sections)} sections saved")

    print(f"Done: {len(words)} words, {duration:.0f}s")
    return meta


def grade_recording(recording_path: str, song_name: str,
                    clip_start: float = None, clip_end: float = None) -> dict:
    """Grade a user recording against ground truth."""
    song_dir = os.path.join(SONGS_DIR, song_name)
    gt_path = os.path.join(song_dir, "ground_truth.json")
    if not os.path.exists(gt_path):
        return {"error": "No ground truth for this song"}

    with open(gt_path) as f:
        gt = json.load(f)
    gt_words = gt["words"]

    # If clip specified, filter ground truth
    if clip_start is not None and clip_end is not None:
        gt_words = [w for w in gt_words if w["start"] >= clip_start and w["end"] <= clip_end]
        if not gt_words:
            return {"error": "No words in selected clip"}

    # Transcribe user recording
    prompt = "rap lyrics, music performance"
    print("Grading recording via OpenAI Whisper API...")
    result = openai_transcribe(recording_path, prompt)

    user_words = []
    for w in result.get("words", []):
        user_words.append({
            "word": w["word"].strip(),
            "start": round(w["start"], 3),
            "end": round(w["end"], 3),
        })

    if not user_words:
        return {
            "error": "No words detected in recording", "grade": "F",
            "accuracy": 0, "timing": 0, "score": 0, "max": len(gt_words) * 10,
            "correct": 0, "partial": 0, "missed": 0, "total_words": len(gt_words),
            "user_words": 0, "flow_recoveries": 0, "details": [],
            "segments": find_best_segments(gt["words"]),
        }

    # Align timestamps: shift ground truth to match recording start
    gt_first = gt_words[0]["start"]
    user_first = user_words[0]["start"]
    offset = user_first - gt_first

    gt_norm = []
    for i, w in enumerate(gt_words):
        gt_norm.append({
            "norm": normalize(w["word"]),
            "start": w["start"] + offset,
            "end": w["end"] + offset,
            "i": i,
        })

    # Grade word-by-word
    results = []
    gt_used = set()
    flow_recoveries = 0

    for uw in user_words:
        un = normalize(uw["word"])
        best = None
        best_score = 0

        for g in gt_norm:
            if g["i"] in gt_used:
                continue
            if g["norm"] == un:
                tdiff = abs(uw["start"] - g["start"])
                if tdiff <= 0.15:
                    score = 10
                elif tdiff <= 0.8:
                    score = 7
                else:
                    score = 4
                if score > best_score:
                    best_score = score
                    best = g

        if best:
            gt_used.add(best["i"])
            results.append({
                "word": uw["word"],
                "expected": gt_words[best["i"]]["word"],
                "score": best_score,
                "diff": round(abs(uw["start"] - best["start"]), 3),
                "status": "correct" if best_score >= 7 else "late",
            })
        else:
            results.append({
                "word": uw["word"], "expected": None,
                "score": 0, "diff": None, "status": "miss",
            })

    # Flow recovery: detect miss→miss→correct patterns
    consecutive_misses = 0
    for r in results:
        if r["status"] == "miss":
            consecutive_misses += 1
        else:
            if consecutive_misses >= 2 and r["score"] >= 7:
                flow_recoveries += 1
            consecutive_misses = 0

    correct = sum(1 for r in results if r["status"] == "correct")
    partial = sum(1 for r in results if r["status"] == "late")
    missed = sum(1 for r in results if r["status"] == "miss")
    total_attempted = len(results)
    total_gt = len(gt_words)

    accuracy = round((correct + partial * 0.7) / max(total_attempted, 1) * 100, 1)
    timing = round(correct / max(correct + partial, 1) * 100, 1)
    score = sum(r["score"] for r in results) + flow_recoveries * 2
    max_possible = total_attempted * 10 + flow_recoveries * 2

    if accuracy >= 95: letter = "S"
    elif accuracy >= 90: letter = "A"
    elif accuracy >= 80: letter = "B"
    elif accuracy >= 70: letter = "C"
    elif accuracy >= 60: letter = "D"
    else: letter = "F"

    segments = find_best_segments(gt["words"])

    return {
        "grade": letter, "accuracy": accuracy, "timing": timing,
        "score": score, "max": max_possible,
        "correct": correct, "partial": partial, "missed": missed,
        "total_words": total_gt, "total_attempted": total_attempted,
        "user_words": len(user_words), "flow_recoveries": flow_recoveries,
        "details": results,
        "segments": segments,
    }


# ═══════════════════════════════════════════════════════════════════════
#  Word Cloud Generation (existing)
# ═══════════════════════════════════════════════════════════════════════

def run_generation(req: GenerateRequest, progress_callback=None):
    def emit(msg):
        if progress_callback:
            progress_callback(msg)

    if not WORDCLOUD_AVAILABLE:
        emit({"step": "error", "message": "wordcloud generation not available"})
        return None

    if req.lyrics_text:
        text = clean_lyrics(req.lyrics_text, include_numbers=req.include_numbers)
    elif req.lyrics_dir:
        text = load_all_lyrics(req.lyrics_dir)
    else:
        text = load_all_lyrics(LYRICS_DIR)

    emit({"step": "lyrics_loaded", "words": len(text.split())})

    phrases = extract_phrases_v7(
        text,
        min_words=req.min_phrase_words,
        max_words=req.max_phrase_words,
        min_count=req.min_phrase_count,
    )

    emit({"step": "phrases_extracted", "count": len(phrases)})

    freq_dict = build_phrase_freq_dict(
        text, phrases, phrase_boost=req.phrase_boost
    )

    emit({"step": "freq_dict_built", "vocab": len(freq_dict)})

    mask_abs = req.mask_path
    if not os.path.isabs(mask_abs):
        mask_abs = os.path.join(MASKS_DIR, req.mask_path)

    portrait = Image.open(mask_abs).convert("RGB")
    orig_w, orig_h = portrait.size
    aspect = orig_h / orig_w
    target_w = req.width
    if req.height:
        target_h = req.height
    else:
        target_h = int(round(target_w * aspect))
        target_h = target_h + (target_h % 2)

    portrait_resized = portrait.resize((target_w, target_h), Image.LANCZOS)
    portrait_arr = np.array(portrait_resized)
    pixels = portrait_arr.reshape(-1, 3).astype(np.float64)
    total_pixels = len(pixels)

    emit({
        "step": "portrait_loaded",
        "target_w": target_w,
        "target_h": target_h,
        "pixels": total_pixels,
    })

    labels, centers = kmeans_numpy(pixels, k=req.clusters)
    labels, centers, keep_mask = merge_small_clusters(centers, labels, min_pct=3.0)
    active_clusters = np.where(keep_mask)[0]

    emit({"step": "clustering_done", "active_clusters": len(active_clusters)})

    cluster_sizes = [(i, np.sum(labels == i)) for i in active_clusters]
    cluster_sizes.sort(key=lambda x: -x[1])

    layer_images = []
    cumulative_occupancy = np.zeros((target_h, target_w), dtype=np.uint8)

    for rank, (ci, px_count) in enumerate(cluster_sizes):
        center = centers[ci]
        r, g, b = int(center[0]), int(center[1]), int(center[2])
        cluster_mask = create_cluster_mask(
            pixels, center, req.threshold, target_w, target_h
        )
        collision_mask = np.maximum(cluster_mask, cumulative_occupancy)
        drawable = np.sum(collision_mask == 0)

        emit({
            "step": "layer_started",
            "rank": rank + 1,
            "total": len(cluster_sizes),
            "cluster_rgb": [r, g, b],
            "drawable_pixels": int(drawable),
        })

        if drawable < 100:
            emit({"step": "layer_skipped", "rank": rank + 1})
            continue

        color_func = make_color_func(portrait_arr, center)

        wc = WordCloud(
            width=target_w,
            height=target_h,
            mode="RGBA",
            background_color=None,
            max_words=req.max_words,
            min_font_size=3,
            max_font_size=100,
            margin=req.margin,
            prefer_horizontal=req.prefer_horizontal,
            relative_scaling=req.relative_scaling,
            collocations=False,
            repeat=req.repeat,
            font_path=req.font if os.path.exists(req.font) else DEFAULT_FONT,
            mask=collision_mask,
            color_func=color_func,
        )
        wc.generate_from_frequencies(freq_dict)

        wc_img_raw = wc.to_image().convert("RGBA")
        layer_occ = rasterize_occupancy(wc_img_raw)
        cumulative_occupancy = np.maximum(cumulative_occupancy, layer_occ)

        wc_arr = np.array(wc_img_raw)
        brightness = (
            wc_arr[:, :, 0].astype(int)
            + wc_arr[:, :, 1].astype(int)
            + wc_arr[:, :, 2].astype(int)
        )
        wc_arr[brightness < 30, 3] = 0
        wc_img = Image.fromarray(wc_arr, "RGBA")

        layer_images.append(wc_img)

        emit({"step": "layer_done", "rank": rank + 1, "cluster_rgb": [r, g, b]})

    if not layer_images:
        emit({"step": "error", "message": "no layers generated"})
        return None

    composite = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    for img in layer_images:
        composite = Image.alpha_composite(composite, img)

    if req.dark_bg:
        dark_bg = Image.new("RGB", (target_w, target_h), (0, 0, 0))
        dark_bg.paste(composite, (0, 0), composite)
        final = dark_bg
    else:
        final = composite

    buf = io.BytesIO()
    final.save(buf, format="PNG")
    buf.seek(0)

    emit({"step": "complete", "layers": len(layer_images)})

    return buf


# ═══════════════════════════════════════════════════════════════════════
#  Word Cloud Endpoints (existing)
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    try:
        result = run_generation(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    if result is None:
        raise HTTPException(status_code=422, detail="No layers generated — check mask image and lyrics input")

    def stream_png():
        yield result.read()

    return StreamingResponse(stream_png(), media_type="image/png")


@app.get("/api/masks")
async def list_masks():
    if not os.path.exists(MASKS_DIR):
        return []
    return [
        f for f in sorted(os.listdir(MASKS_DIR))
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ]


@app.get("/api/lyrics")
async def list_lyrics():
    if not os.path.exists(LYRICS_DIR):
        return []
    return [
        f for f in sorted(os.listdir(LYRICS_DIR))
        if f.endswith('.txt')
    ]


@app.get("/api/lyrics/{filename}")
async def get_lyrics(filename: str):
    file_path = os.path.join(LYRICS_DIR, filename)
    if not os.path.isfile(file_path):
        return {"error": "not found"}
    with open(file_path, 'r') as f:
        return {"filename": filename, "content": f.read()}


@app.get("/api/gallery")
async def list_gallery():
    if not os.path.exists(GALLERY_DIR):
        return []
    results = []
    for name in sorted(os.listdir(GALLERY_DIR)):
        subdir = os.path.join(GALLERY_DIR, name)
        if not os.path.isdir(subdir):
            continue
        entry = {"name": name}
        dark_path = os.path.join(subdir, "LAYER_composite_dark.png")
        if os.path.exists(dark_path):
            entry["dark_image"] = f"/api/gallery-img/{name}/LAYER_composite_dark.png"
        transparent_path = os.path.join(subdir, "LAYER_composite.png")
        if os.path.exists(transparent_path):
            entry["transparent_image"] = f"/api/gallery-img/{name}/LAYER_composite.png"
        layer_files = sorted([
            f for f in os.listdir(subdir)
            if f.startswith("LAYER_") and f.endswith(".png")
            and f not in ("LAYER_composite.png", "LAYER_composite_dark.png")
        ])
        entry["layers"] = layer_files
        results.append(entry)
    return results


@app.get("/api/gallery-img/{subdir}/{filename}")
async def serve_gallery_image(subdir: str, filename: str):
    file_path = os.path.join(GALLERY_DIR, subdir, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path, media_type="image/png")
    return {"error": "not found"}


@app.get("/api/generate/stream")
async def generate_stream(
    mask_path: str = Query(...),
    lyrics_text: Optional[str] = Query(None),
    lyrics_dir: Optional[str] = Query(None),
    font: str = Query(DEFAULT_FONT),
    width: int = Query(1200),
    height: Optional[int] = Query(None),
    clusters: int = Query(7),
    max_words: int = Query(3000),
    margin: int = Query(1),
    prefer_horizontal: float = Query(1.0),
    relative_scaling: float = Query(0.0),
    repeat: bool = Query(False),
    min_phrase_count: int = Query(3),
    min_phrase_words: int = Query(3),
    max_phrase_words: int = Query(6),
    phrase_boost: float = Query(4.0),
    dark_bg: bool = Query(True),
    include_numbers: bool = Query(False),
    threshold: int = Query(50),
):
    req = GenerateRequest(
        mask_path=mask_path,
        lyrics_text=lyrics_text,
        lyrics_dir=lyrics_dir,
        font=font,
        width=width,
        height=height,
        clusters=clusters,
        max_words=max_words,
        margin=margin,
        prefer_horizontal=prefer_horizontal,
        relative_scaling=relative_scaling,
        repeat=repeat,
        min_phrase_count=min_phrase_count,
        min_phrase_words=min_phrase_words,
        max_phrase_words=max_phrase_words,
        phrase_boost=phrase_boost,
        dark_bg=dark_bg,
        include_numbers=include_numbers,
        threshold=threshold,
    )

    queue = asyncio.Queue()

    def on_progress(msg):
        queue.put_nowait(msg)

    async def worker():
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: run_generation(req, on_progress))
        queue.put_nowait(None)

    asyncio.create_task(worker())

    async def event_generator():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("step") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                continue

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ═══════════════════════════════════════════════════════════════════════
#  Karaoke Endpoints (ported from karaoke-mvp/server.py)
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/songs")
async def list_songs():
    """List all songs with metadata."""
    if not os.path.exists(SONGS_DIR):
        return []
    songs = []
    for d in sorted(os.listdir(SONGS_DIR)):
        meta_path = os.path.join(SONGS_DIR, d, "metadata.json")
        if os.path.isfile(meta_path):
            with open(meta_path) as f:
                songs.append(json.load(f))
    return songs


@app.get("/api/songs/{name}")
async def get_song(name: str):
    """Get ground truth for a song (lyrics + word timing)."""
    gt_path = os.path.join(SONGS_DIR, name, "ground_truth.json")
    if not os.path.exists(gt_path):
        raise HTTPException(status_code=404, detail="song not found")
    with open(gt_path) as f:
        return json.load(f)


@app.post("/api/songs/{name}/prepare")
async def prepare_song_endpoint(name: str, req: PrepareRequest):
    """YouTube download + Whisper transcription."""
    if not req.url:
        raise HTTPException(status_code=400, detail="url required")
    result = prepare_song(req.url, name, req.lyrics)
    return result


@app.post("/api/songs/{name}/grade")
async def grade_song_endpoint(name: str, req: GradeRequest):
    """Grade a user recording against ground truth."""
    if not req.audio:
        raise HTTPException(status_code=400, detail="audio required")

    # Verify song has ground truth before doing any work
    gt_path = os.path.join(SONGS_DIR, name, "ground_truth.json")
    if not os.path.exists(gt_path):
        raise HTTPException(status_code=404, detail="song not found")

    ts = time.strftime("%Y%m%d_%H%M%S")

    # Save recording
    recording_dir = os.path.join(SONGS_DIR, name, "recordings")
    os.makedirs(recording_dir, exist_ok=True)
    recording_path = os.path.join(recording_dir, f"{ts}.webm")
    with open(recording_path, "wb") as f:
        f.write(base64.b64decode(req.audio))

    # Convert to 16kHz mono WAV
    wav = recording_path.replace(".webm", ".wav")
    try:
        subprocess.run(
            ["ffmpeg", "-i", recording_path, "-ar", "16000", "-ac", "1", wav, "-y"],
            capture_output=True, timeout=30,
        )
        result = grade_recording(wav, name, req.clip_start, req.clip_end)

        result["song"] = name
        result["timestamp"] = ts
        result["clip_start"] = req.clip_start
        result["clip_end"] = req.clip_end

        # Save grade locally
        grade_dir = os.path.join(SONGS_DIR, name, "grades")
        os.makedirs(grade_dir, exist_ok=True)
        grade_path = os.path.join(grade_dir, f"{ts}.json")
        with open(grade_path, "w") as f:
            json.dump(result, f, indent=2)

        # Upload to R2 in background (non-blocking)
        try:
            subprocess.Popen([
                "rclone", "copy", recording_path,
                f"r2:karaoke-poc/recordings/{name}/{ts}.webm",
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.Popen([
                "rclone", "copy", grade_path,
                f"r2:karaoke-poc/grades/{name}/{ts}.json",
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass  # R2 upload is non-critical

        return result
    finally:
        # Clean up WAV
        if os.path.exists(wav):
            os.unlink(wav)


@app.put("/api/songs/{name}/text")
async def update_song_text(name: str, req: UpdateTextRequest):
    """Update lyrics text for a song."""
    gt_path = os.path.join(SONGS_DIR, name, "ground_truth.json")
    if not os.path.exists(gt_path):
        raise HTTPException(status_code=404, detail="song not found")
    with open(gt_path) as f:
        gt = json.load(f)
    gt["text"] = req.text
    with open(gt_path, "w") as f:
        json.dump(gt, f, indent=2)
    return {"status": "updated"}


@app.put("/api/songs/{name}/timing")
async def update_song_timing(name: str, req: UpdateTimingRequest):
    """Update word timing for a song."""
    gt_path = os.path.join(SONGS_DIR, name, "ground_truth.json")
    if not os.path.exists(gt_path):
        raise HTTPException(status_code=404, detail="song not found")
    with open(gt_path) as f:
        gt = json.load(f)
    gt["words"] = req.words
    with open(gt_path, "w") as f:
        json.dump(gt, f, indent=2)
    return {"status": "updated"}


# ═══════════════════════════════════════════════════════════════════════
#  SPA Catch-all (must be last)
# ═══════════════════════════════════════════════════════════════════════

@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str = ""):
    file_path = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        response = FileResponse(file_path)
        # Cache-bust HTML, allow caching for hashed assets
        if full_path.endswith('.html') or full_path == '':
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        else:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index):
        response = FileResponse(index)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response
    return HTMLResponse("<h1>Build not found. Run: node ./node_modules/vite/bin/vite.js build</h1>", status_code=404)
