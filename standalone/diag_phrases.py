#!/usr/bin/env python3
"""Diagnostic: check why 'love yourz' isn't the biggest phrase."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_layers_v8 import clean_lyrics, extract_phrases_v7, RAP_STOPWORDS

with open('lyrics/love_yourz.txt') as f:
    raw = f.read()
text = clean_lyrics(raw)

print('=== Cleaned text (first 600 chars) ===')
print(text[:600])
print()

words = text.split()

print('=== All occurrences of "love" with context ===')
for i, w in enumerate(words):
    if w == 'love':
        context = words[max(0,i-2):i+3]
        print(f'  pos {i}: "{" ".join(context)}"')
print()

print('=== All occurrences of "your" with context ===')
for i, w in enumerate(words):
    if 'your' in w:
        context = words[max(0,i-2):i+3]
        print(f'  pos {i}: "{" ".join(context)}"')
print()

print('=== "no such thing" count ===')
nst_count = text.count('no such thing')
print(f'  "no such thing" appears {nst_count} times')
print()

print('=== Phrases with min_words=2, min_count=1 ===')
phrases = extract_phrases_v7(text, min_words=2, max_words=9, min_count=1)
for p, c, l in phrases[:25]:
    print(f'  [{c:2d}x, {l}w] {p}')
print()

print('=== Default phrases (min_words=3, min_count=3, max_words=6) ===')
phrases2 = extract_phrases_v7(text, min_words=3, max_words=6, min_count=3)
for p, c, l in phrases2[:25]:
    print(f'  [{c:2d}x, {l}w] {p}')
