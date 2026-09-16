#!/usr/bin/env python3
"""Clean lyrics files - remove scraped metadata, URLs, album covers, etc."""
import os
import re

LYRICS_DIR = "lyrics"

CLEANED_COUNT = 0
for fname in sorted(os.listdir(LYRICS_DIR)):
    if not fname.endswith(".txt") or fname == "manifest.json":
        continue
    
    filepath = os.path.join(LYRICS_DIR, fname)
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    
    original = text
    
    # Remove album cover metadata (the big concatenated strings)
    text = re.sub(r"albumcovers\w+thumbjpg", "", text, flags=re.IGNORECASE)
    text = re.sub(r"suggesteditsong\w+lyrics", "", text, flags=re.IGNORECASE)
    text = re.sub(r"falloffjcole\w+lyrics", "", text, flags=re.IGNORECASE)
    text = re.sub(r"jcole\w+lyrics", "", text, flags=re.IGNORECASE)
    
    # Remove URLs
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"www\.\S+", "", text)
    
    # Remove common scraped headers/metadata
    text = re.sub(r"# .*? Lyrics & Meaning.*?from The Fall-Off.*?\n", "", text)
    text = re.sub(r"Save this song for later.*?\n", "", text)
    text = re.sub(r"Lyrics & Meaning.*?\n", "", text)
    text = re.sub(r"Watch & listen.*?\n", "", text)
    text = re.sub(r"by J\. Cole.*?\n", "", text)
    text = re.sub(r"from The Fall-Off.*?\n", "", text)
    
    # Remove common web artifacts
    text = re.sub(r"algorithm moderated", "", text, flags=re.IGNORECASE)
    text = re.sub(r"streaming service automated", "", text, flags=re.IGNORECASE)
    text = re.sub(r"shark infested", "", text, flags=re.IGNORECASE)
    text = re.sub(r"embed", "", text, flags=re.IGNORECASE)
    text = re.sub(r"copy url", "", text, flags=re.IGNORECASE)
    text = re.sub(r"genius", "", text, flags=re.IGNORECASE)
    
    # Remove repeated chars (like "ssssstutterin" -> "stutterin")
    text = re.sub(r"(.)\1{3,}", r"\1\1", text)
    
    # Remove bracket annotations [chorus], [verse], etc.
    text = re.sub(r"\[.*?\]", "", text)
    
    # Clean whitespace
    text = re.sub(r"\s+", " ", text).strip()
    
    if text != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        CLEANED_COUNT += 1
        orig_words = len(original.split())
        new_words = len(text.split())
        print(f"  Cleaned {fname}: {orig_words} -> {new_words} words ({orig_words - new_words} removed)")

print(f"\nCleaned {CLEANED_COUNT} lyrics files")
