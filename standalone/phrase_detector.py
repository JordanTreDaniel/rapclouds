#!/usr/bin/env python3
"""
RapClouds Phrase Detector — Standalone modular phrase extraction.

Finds repeating n-grams in lyrics and outputs a table of phrases with counts.
Works on any song or album. Can be imported by other scripts.

Usage:
    # Single song
    python3 phrase_detector.py --lyrics lyrics/love_yourz.txt

    # Album (all songs)
    python3 phrase_detector.py --lyrics-dir lyrics/

    # Custom settings
    python3 phrase_detector.py --lyrics-dir lyrics/ --min-words 3 --min-count 3 --top 50

    # Export to CSV
    python3 phrase_detector.py --lyrics-dir lyrics/ --csv phrases.csv

    # JSON output (for programmatic use)
    python3 phrase_detector.py --lyrics-dir lyrics/ --json
"""

import os
import re
import sys
import json
import argparse
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from generate_cloud import clean_lyrics

# ─── Stopwords ──────────────────────────────────────────────────────────────
from wordcloud import STOPWORDS

RAP_STOPWORDS = STOPWORDS.copy()
RAP_STOPWORDS.update([
    "im", "ive", "youre", "hes", "shes", "its", "were", "theyre",
    "ill", "youll", "hell", "shell", "itll", "well", "theyll",
    "id", "youd", "hed", "shed", "wed", "theyd",
    "cant", "dont", "wont", "isnt", "arent", "wasnt", "werent",
    "doesnt", "didnt", "hasnt", "hadnt", "shouldnt", "wouldnt", "couldnt",
    "thats", "whats", "heres", "theres", "whos", "hows",
    "gonna", "gotta", "wanna", "em", "bout", "cause", "cuz",
    "ya", "yo", "nah", "yeah", "ayy", "ay", "oh", "ooh",
    "like", "just", "got", "get", "go", "gon", "man",
    "one", "two", "three", "first", "new", "way", "back",
    "still", "even", "also", "right", "now", "ever",
])


# ─── Core phrase extraction ─────────────────────────────────────────────────

def extract_phrases(text, min_words=3, max_words=None, min_count=2, max_stopwords_ratio=0.5):
    """
    Extract repeating n-grams from text.

    Args:
        text: cleaned lyrics text (space-separated)
        min_words: minimum phrase length in words (default 3)
        max_words: maximum phrase length (None = no limit)
        min_count: minimum times a phrase must appear
        max_stopwords_ratio: max fraction of stopwords in a phrase (0.5 = half)

    Returns:
        list of (phrase, count, length) sorted by count desc, then length desc
    """
    words = text.split()
    n_words = len(words)

    if max_words is None or max_words == 0:
        max_words = n_words  # no limit

    # Count all n-grams
    ngram_counts = Counter()

    for n in range(min_words, min(max_words + 1, n_words + 1)):
        for i in range(n_words - n + 1):
            ngram = tuple(words[i:i + n])

            # Skip all-stopword phrases
            if all(w in RAP_STOPWORDS for w in ngram):
                continue

            # Skip phrases with too many stopwords
            stopword_count = sum(1 for w in ngram if w in RAP_STOPWORDS)
            if stopword_count > len(ngram) * max_stopwords_ratio:
                continue

            ngram_counts[ngram] += 1

    # Filter to repeated phrases
    repeated = [(ngram, count) for ngram, count in ngram_counts.items()
                if count >= min_count]

    # Sort by length desc, then count desc (longest first for dedup)
    repeated.sort(key=lambda x: (-len(x[0]), -x[1]))

    # Deduplicate: if phrase A is a substring of phrase B (and B appears >= as often),
    # keep only B. This removes the overlapping n-gram noise.
    deduped = []
    seen_phrases = set()

    for ngram, count in repeated:
        phrase_str = " ".join(ngram)
        # Check if this phrase is a substring of any already-kept longer phrase
        is_substring = False
        for kept_ngram, _ in deduped:
            kept_str = " ".join(kept_ngram)
            if phrase_str in kept_str:
                is_substring = True
                break
        if not is_substring:
            deduped.append((ngram, count))
            seen_phrases.add(phrase_str)

    # Sort final results by count desc, then length desc
    deduped.sort(key=lambda x: (-x[1], -len(x[0])))

    # Convert to (phrase_string, count, length)
    results = [(" ".join(ngram), count, len(ngram)) for ngram, count in deduped]

    return results


def build_replacement_map(phrases):
    """
    Build a replacement map from phrase list (for wordcloud token replacement).

    Args:
        phrases: list of (phrase, count, length) from extract_phrases()

    Returns:
        dict mapping underscored_phrase -> original_phrase
    """
    # Sort by length descending (longest phrases first for replacement)
    by_length = sorted(phrases, key=lambda x: -x[2])
    return {p[0].replace(" ", "_"): p[0] for p in by_length}


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="RapClouds Phrase Detector — find repeating phrases in lyrics",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 phrase_detector.py --lyrics lyrics/love_yourz.txt
  python3 phrase_detector.py --lyrics-dir lyrics/ --min-words 4 --top 30
  python3 phrase_detector.py --lyrics-dir lyrics/ --min-count 3 --csv phrases.csv
  python3 phrase_detector.py --lyrics-dir lyrics/ --json
        """)
    p.add_argument("--lyrics", help="Path to a single lyrics .txt file")
    p.add_argument("--lyrics-dir", default="lyrics", help="Directory of lyrics .txt files (default: lyrics/)")
    p.add_argument("--min-words", type=int, default=3, help="Minimum phrase length in words (default: 3)")
    p.add_argument("--max-words", type=int, default=10, help="Maximum phrase length (default: 10, use 0 for no limit)")
    p.add_argument("--min-count", type=int, default=2, help="Minimum times a phrase must appear (default: 2)")
    p.add_argument("--top", type=int, default=50, help="Show top N phrases (default: 50)")
    p.add_argument("--csv", help="Export to CSV file")
    p.add_argument("--json", action="store_true", help="Output as JSON")
    p.add_argument("--no-header", action="store_true", help="Hide table header")
    p.add_argument("--show-all", action="store_true", help="Show all phrases (ignore --top)")
    return p.parse_args()


def load_and_clean(path):
    """Load a lyrics file and clean it."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    return clean_lyrics(text, include_numbers=False)


def main():
    args = parse_args()
    os.chdir(SCRIPT_DIR)

    # Load lyrics
    if args.lyrics:
        with open(args.lyrics, "r", encoding="utf-8") as f:
            raw = f.read()
        text = clean_lyrics(raw, include_numbers=False)
        source = os.path.basename(args.lyrics)
    else:
        all_text = []
        files = sorted(f for f in os.listdir(args.lyrics_dir)
                       if f.endswith(".txt") and f != "manifest.json")
        for fname in files:
            with open(os.path.join(args.lyrics_dir, fname)) as f:
                raw = f.read()
            cleaned = clean_lyrics(raw, include_numbers=False)
            if len(cleaned.split()) > 20:
                all_text.append(cleaned)
        text = " ".join(all_text)
        source = f"{len(files)} songs in {args.lyrics_dir}/"

    word_count = len(text.split())
    print(f"Source: {source}")
    print(f"Words after cleaning: {word_count:,}")
    print()

    # Extract phrases
    phrases = extract_phrases(
        text,
        min_words=args.min_words,
        max_words=args.max_words,
        min_count=args.min_count,
    )

    if not phrases:
        print("No phrases found matching criteria.")
        return

    print(f"Phrases found: {len(phrases):,}")
    print(f"Criteria: min_words={args.min_words}, min_count={args.min_count}"
          + (f", max_words={args.max_words}" if args.max_words else ""))
    print()

    # JSON output
    if args.json:
        output = [{"phrase": p, "count": c, "words": l} for p, c, l in phrases]
        print(json.dumps(output, indent=2))
        return

    # Table output
    display = phrases if args.show_all else phrases[:args.top]

    if not args.no_header:
        print(f"{'#':>4}  {'Count':>6}  {'Words':>5}  Phrase")
        print(f"{'─'*4}  {'─'*6}  {'─'*5}  {'─'*40}")

    for i, (phrase, count, length) in enumerate(display, 1):
        print(f"{i:>4}  {count:>6}  {length:>5}  {phrase}")

    if not args.show_all and len(phrases) > args.top:
        print(f"\n... {len(phrases) - args.top} more phrases (use --show-all to see all)")

    # CSV export
    if args.csv:
        with open(args.csv, "w") as f:
            f.write("phrase,count,words\n")
            for phrase, count, length in phrases:
                # Escape phrases with commas
                if "," in phrase:
                    phrase = f'"{phrase}"'
                f.write(f"{phrase},{count},{length}\n")
        print(f"\nExported {len(phrases)} phrases to {args.csv}")

    # Summary stats
    print()
    lengths = Counter(l for _, _, l in phrases)
    print("Phrase length distribution:")
    for length in sorted(lengths.keys()):
        bar = "█" * min(lengths[length] // 10, 50)
        print(f"  {length} words: {lengths[length]:>5} phrases  {bar}")

    total_words_in_phrases = sum(c * l for _, c, l in phrases)
    print(f"\nTotal words in phrases: {total_words_in_phrases:,}")
    print(f"Coverage: {100 * total_words_in_phrases / word_count:.1f}% of corpus is in repeated phrases")


if __name__ == "__main__":
    main()
