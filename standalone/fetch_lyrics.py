#!/usr/bin/env python3
"""
Fetch J. Cole - The Fall-Off lyrics from AZLyrics.
No API key required. Simple HTML scraping.
"""

import os
import re
import time
import json
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}

# The Fall-Off tracklist
TRACKS = [
    # Disc 29
    ("29 Intro", "29intro"),
    ("Two Six", "twosix"),
    ("SAFETY", "safety"),
    ("Run A Train", "runatrain"),
    ("Poor Thang", "poorthang"),
    ("Legacy", "legacy"),
    ("Bunce Road Blues", "bunceroadblues"),
    ("WHO TF IZ U", "whotfizu"),
    ("Drum n Bass", "drumnandbass"),
    ("The Let Out", "theletout"),
    ("Bombs in the Ville", "bombsintheville"),
    ("Lonely at the Top", "lonelyatthetop"),
    # Disc 39
    ("39 Intro", "39intro"),
    ("The Fall-Off Is Inevitable", "thefalloffisinevitable"),
    ("The Villest", "thevillest"),
    ("Old Dog", "olddog"),
    ("Life Sentence", "lifesentence"),
    ("Only You", "onlyyou"),
    ("Man Up Above", "manupabove"),
    ("I Love Her Again", "iloveheragain"),
    ("What If", "whatif"),
    ("Quik Stop", "quikstop"),
    ("and the whole world is the Ville", "andthewholeworldistheville"),
    ("Ocean Way", "oceanway"),
]


def slug_for_azlyrics(title):
    """Convert song title to AZLyrics URL slug."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)
    slug = re.sub(r"\s+", "", slug)
    return slug


def scrape_azlyrics(artist_slug, song_slug):
    """Scrape lyrics from AZLyrics."""
    url = f"https://www.azlyrics.com/lyrics/{artist_slug}/{song_slug}.html"
    try:
        s = requests.Session()
        s.headers.update(HEADERS)
        r = s.get(url, timeout=15)
        if r.status_code != 200:
            return None, url

        soup = BeautifulSoup(r.text, "html.parser")
        main = soup.find("div", class_="container main-page")
        if not main:
            return None, url

        text = main.get_text(separator="\n")
        lines = text.split("\n")

        # Find lyrics start (after the "Lyrics" header line)
        lyrics_start = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped == "Lyrics" or (stripped.endswith("Lyrics") and len(stripped) < 60):
                lyrics_start = i + 1
                break

        # Get lyrics lines, skipping empty ones at the start
        lyrics_lines = []
        started = False
        for line in lines[lyrics_start:]:
            stripped = line.strip()
            if not started and not stripped:
                continue
            if stripped:
                started = True
            # Stop at footer content
            if stripped.startswith("Thanks") and "azlyrics" in stripped.lower():
                break
            if stripped.startswith("---"):
                break
            lyrics_lines.append(stripped)

        lyrics = "\n".join(lyrics_lines).strip()

        # Remove leading song title if present (e.g. "Song Title")
        lyrics = re.sub(r'^"[^"]*"\s*\n*', '', lyrics)
        lyrics = re.sub(r"^'[^']*'\s*\n*", '', lyrics)

        return lyrics if lyrics else None, url

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None, url


def fetch_all_lyrics(output_dir="lyrics"):
    """Fetch lyrics for all tracks."""
    os.makedirs(output_dir, exist_ok=True)
    results = {}

    print(f"🎵 Fetching lyrics for J. Cole - The Fall-Off ({len(TRACKS)} tracks)")
    print(f"   Source: AZLyrics\n")

    for i, (title, slug) in enumerate(TRACKS, 1):
        print(f"[{i:2d}/{len(TRACKS)}] {title}")

        lyrics, url = scrape_azlyrics("jcole", slug)

        if lyrics:
            safe_name = re.sub(r"[^\w\s-]", "", title).strip()
            safe_name = re.sub(r"\s+", "_", safe_name)
            filepath = os.path.join(output_dir, f"{safe_name}.txt")

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(lyrics)

            word_count = len(lyrics.split())
            print(f"  ✅ Saved ({word_count} words)")
            results[title] = {"file": filepath, "words": word_count, "url": url}
        else:
            print(f"  ⚠️  Not found on AZLyrics")
            results[title] = {"file": None, "words": 0, "url": url}

        # Rate limiting
        time.sleep(1.0)

    # Summary
    print(f"\n{'='*50}")
    fetched = sum(1 for r in results.values() if r["file"])
    total_words = sum(r["words"] for r in results.values())
    print(f"✅ Fetched {fetched}/{len(TRACKS)} tracks ({total_words:,} total words)")

    # Save manifest
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"📋 Manifest saved to {manifest_path}")

    return results


if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "lyrics")
    fetch_all_lyrics(output_dir)
