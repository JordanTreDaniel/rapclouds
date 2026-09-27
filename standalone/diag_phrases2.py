#!/usr/bin/env python3
"""Deep diagnostic on why 'no such thing' isn't in phrases."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_layers_v8 import clean_lyrics, extract_phrases_v7, RAP_STOPWORDS
from collections import Counter

with open('lyrics/love_yourz.txt') as f:
    raw = f.read()
text = clean_lyrics(raw)
words = text.split()

# Manually count "no such thing" 3-gram
nst_count = 0
for i in range(len(words) - 2):
    if words[i:i+3] == ['no', 'such', 'thing']:
        nst_count += 1
print(f'Manual "no such thing" count: {nst_count}')

# Check stopwords for each word
for w in ['no', 'such', 'thing', 'as', 'a', 'life', 'thats', 'better', 'than', 'yours']:
    print(f'  "{w}" is stopword: {w in RAP_STOPWORDS}')

# Manually count all 3-grams to see what the counter produces
ngram_counts = Counter()
for n in range(3, 7):  # min_words=3, max_words=6
    for i in range(len(words) - n + 1):
        ngram = tuple(words[i:i + n])
        if all(w in RAP_STOPWORDS for w in ngram):
            continue
        stopword_count = sum(1 for w in ngram if w in RAP_STOPWORDS)
        if stopword_count > len(ngram) * 0.5:
            continue
        ngram_counts[ngram] += 1

# Check "no such thing" specifically
nst_tuple = ('no', 'such', 'thing')
print(f'\n"no such thing" in Counter: {nst_tuple in ngram_counts}, count: {ngram_counts.get(nst_tuple, 0)}')

# Show top 20 by count
print('\n=== Top 20 raw n-grams (before dedup) ===')
for ngram, count in ngram_counts.most_common(20):
    print(f'  [{count:2d}x, {len(ngram)}w] {" ".join(ngram)}')

# Now run the full extraction
print('\n=== Full extraction with min_words=3, max_words=6, min_count=1 ===')
phrases = extract_phrases_v7(text, min_words=3, max_words=6, min_count=1)
for p, c, l in phrases:
    print(f'  [{c:2d}x, {l}w] {p}')
