#!/usr/bin/env python3
"""API routine: test the RapClouds generate endpoint directly.

Routine:
  1. GET /api/masks — verify masks load
  2. GET /api/lyrics — verify tracks load
  3. GET /api/lyrics/love_yourz.txt — verify single track loads
  4. POST /api/generate — minimal payload, verify PNG returned
  5. POST /api/generate — full payload with love_yourz lyrics, verify PNG

Proof: JSON summary with status + timings + image sizes.
"""

import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"

results = []


def hit(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    t0 = time.time()
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        elapsed = time.time() - t0
        content = resp.read()
        return resp.status, elapsed, content
    except urllib.error.HTTPError as e:
        elapsed = time.time() - t0
        body = e.read().decode(errors="replace")
        return e.code, elapsed, body
    except Exception as e:
        elapsed = time.time() - t0
        return 0, elapsed, str(e)


def test(name, method, path, data=None, expect_status=200, expect_content_type=None):
    status, elapsed, content = hit(method, path, data)
    ok = status == expect_status
    size = len(content) if isinstance(content, bytes) else 0
    is_png = content[:8] == b"\x89PNG\r\n\x1a\n" if isinstance(content, bytes) else False

    detail = {
        "name": name,
        "status": status,
        "expected": expect_status,
        "pass": ok,
        "time_s": round(elapsed, 2),
        "size_bytes": size,
    }
    if expect_content_type == "png":
        detail["is_png"] = is_png
        detail["pass"] = ok and is_png

    results.append(detail)
    icon = "PASS" if detail["pass"] else "FAIL"
    print(f"  {icon} {name} — {status} in {elapsed:.1f}s ({size} bytes)")
    return detail


print("=== RapClouds API Routine ===\n")

print("1. Endpoint discovery")
test("GET /api/masks", "GET", "/api/masks")
test("GET /api/lyrics", "GET", "/api/lyrics")
test("GET /api/lyrics/love_yourz.txt", "GET", "/api/lyrics/love_yourz.txt")
test("GET /api/gallery", "GET", "/api/gallery")

print("\n2. Generation — minimal payload")
minimal_payload = {
    "mask_path": "jcole_face_illustration.jpg",
    "lyrics_text": "dreams come true grind hustle never stop",
    "width": 400,
    "clusters": 3,
    "max_words": 100,
}
test(
    "POST /api/generate (minimal)",
    "POST",
    "/api/generate",
    data=minimal_payload,
    expect_content_type="png",
)

print("\n3. Generation — real lyrics")
lyrics_res, _, lyrics_content = hit("GET", "/api/lyrics/love_yourz.txt")
if lyrics_res == 200:
    lyrics_data = json.loads(lyrics_content)
    real_payload = {
        "mask_path": "jcole_face_illustration.jpg",
        "lyrics_text": lyrics_data["content"],
        "width": 600,
        "clusters": 4,
        "max_words": 500,
    }
    test(
        "POST /api/generate (love_yourz)",
        "POST",
        "/api/generate",
        data=real_payload,
        expect_content_type="png",
    )
else:
    results.append({"name": "lyrics_load", "pass": False, "error": f"status {lyrics_res}"})
    print(f"  FAIL lyrics load — status {lyrics_res}")

print("\n4. Error cases")
test(
    "POST /api/generate (missing mask)",
    "POST",
    "/api/generate",
    data={"mask_path": "nonexistent.jpg", "width": 400},
    expect_status=500,
)
test(
    "POST /api/generate (empty body)",
    "POST",
    "/api/generate",
    data={},
    expect_status=422,
)

passed = sum(1 for r in results if r["pass"])
total = len(results)
print(f"\n=== Results: {passed}/{total} passed ===")

if passed < total:
    print("\nFailures:")
    for r in results:
        if not r["pass"]:
            print(f"  - {r['name']}: {r}")

sys.exit(0 if passed == total else 1)
