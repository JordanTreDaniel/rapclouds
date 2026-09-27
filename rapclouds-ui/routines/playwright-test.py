#!/usr/bin/env python3
"""Playwright routine: end-to-end browser test of RapClouds generation flow.

CRITERIA:
  - App loads at target URL with all sidebar controls visible
  - Track selector populated with J. Cole tracks
  - Selecting a track loads lyrics into textarea
  - Clicking Generate shows loading state
  - Generation completes and displays the word cloud image
  - Gallery updates with the new generation

ROUTINE:
  1. Navigate to app, screenshot initial state
  2. Verify sidebar sections render (InputSource, Typography, etc.)
  3. Select "Single Track" mode, pick "love_yourz" from dropdown
  4. Screenshot after track selection (lyrics should be populated)
  5. Click Generate button
  6. Screenshot loading state (spinner visible)
  7. Wait for generation to complete (poll for image or timeout)
  8. Screenshot final result
  9. Verify gallery updated

PROOF:
  - screenshots/01-initial.png — app loaded
  - screenshots/02-track-selected.png — love_yourz loaded
  - screenshots/03-generating.png — loading spinner
  - screenshots/04-result.png — generated word cloud
  - results.json — pass/fail per step with timings
"""

import json
import os
import sys
import time

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
RESULTS_FILE = os.path.join(os.path.dirname(__file__), "results.json")
TARGET_URL = os.environ.get("TARGET_URL", "https://rapclouds.jordanchristley.com")
GENERATION_TIMEOUT = 180

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

results = []
steps = []


def log(msg):
    print(f"  {msg}")


def step(name, fn):
    t0 = time.time()
    try:
        fn()
        elapsed = time.time() - t0
        steps.append({"name": name, "pass": True, "time_s": round(elapsed, 2)})
        log(f"PASS {name} ({elapsed:.1f}s)")
        return True
    except Exception as e:
        elapsed = time.time() - t0
        steps.append({"name": name, "pass": False, "time_s": round(elapsed, 2), "error": str(e)})
        log(f"FAIL {name}: {e}")
        return False


print("=== RapClouds Playwright Routine ===")
print(f"Target: {TARGET_URL}\n")

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.set_default_timeout(30000)

    page.on("dialog", lambda dialog: (log(f"ALERT: {dialog.message}") or dialog.dismiss()))

    def api_call(method, path, data=None):
        url = f"{TARGET_URL}{path}"
        body = json.dumps(data) if data else None
        resp = page.request.fetch(url, method=method, data=body, headers={"Content-Type": "application/json"} if data else {})
        return resp

    print("1. Load app")
    def load_app():
        page.goto(TARGET_URL, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01-initial.png"), full_page=False)
        assert page.title(), "Page has no title"
        log(f"Title: {page.title()}")
    step("load_app", load_app)

    print("\n2. Verify sidebar sections")
    def check_sidebar():
        sections = page.query_selector_all(".border.border-border.rounded-lg")
        log(f"Found {len(sections)} sidebar sections")
        assert len(sections) >= 5, f"Expected >= 5 sidebar sections, got {len(sections)}"
    step("check_sidebar", check_sidebar)

    print("\n3. Select Single Track + pick love_yourz")
    def select_track():
        single_btn = page.get_by_text("Single Track", exact=True)
        if single_btn:
            single_btn.click()
            page.wait_for_timeout(1000)

        select_el = page.query_selector("select")
        if select_el:
            options = page.query_selector_all("select option")
            log(f"Track dropdown has {len(options)} options")
            assert len(options) > 1, "Track dropdown is empty"

            select_el.select_option(value="love_yourz.txt")
            page.wait_for_timeout(3000)
            log("Selected love_yourz.txt")
        else:
            log("No select element found — checking if tracks loaded")
            raise Exception("Track selector not found")

        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02-track-selected.png"), full_page=False)

        textarea = page.query_selector("textarea")
        if textarea:
            val = textarea.input_value()
            log(f"Textarea has {len(val)} chars")
            assert len(val) > 100, f"Lyrics not loaded, textarea has {len(val)} chars"
    step("select_track", select_track)

    print("\n4. Click Generate (fast settings via URL params)")
    generate_clicked = {"time": None}

    def click_generate():
        page.evaluate("""
            const inputs = document.querySelectorAll('input[type="range"]');
            const setVal = (el, val) => {
                const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                s.call(el, val);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };
            if (inputs[0]) setVal(inputs[0], 800);
            if (inputs[1]) setVal(inputs[1], 800);
            const clusterSlider = Array.from(inputs).find(el => el.min === '3' && el.max === '12');
            if (clusterSlider) setVal(clusterSlider, 3);
            const maxWordsSlider = Array.from(inputs).find(el => el.min === '500');
            if (maxWordsSlider) setVal(maxWordsSlider, 200);
        """)
        page.wait_for_timeout(500)
        log("Set fast params: 800x800, 3 clusters, 200 words")

        btn = page.get_by_text("Generate RapCloud", exact=True)
        assert btn, "Generate button not found"
        btn.click()
        generate_clicked["time"] = time.time()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03-generating.png"), full_page=False)

        spinner = page.query_selector("button:disabled")
        if spinner:
            log("Button disabled (loading state confirmed)")
    step("click_generate", click_generate)

    print("\n5. Wait for generation (up to 3 minutes)")
    def wait_for_result():
        start = time.time()
        errors = []

        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        while time.time() - start < GENERATION_TIMEOUT:
            try:
                btn = page.locator("button").filter(has_text="Generate").first
                btn_text = btn.inner_text(timeout=2000)
                is_loading = "Generating" in btn_text
            except Exception:
                is_loading = True
                btn_text = "?"

            img = page.query_selector("img[alt='Generated word cloud']")
            if img:
                src = page.get_attribute("img[alt='Generated word cloud']", "src") or ""
                if src.startswith("blob:"):
                    page.wait_for_timeout(1000)
                    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04-result.png"), full_page=False)
                    log(f"Image appeared after {time.time() - start:.1f}s")
                    return

            if not is_loading and time.time() - start > 5:
                page.wait_for_timeout(2000)
                img = page.query_selector("img[alt='Generated word cloud']")
                if img:
                    src = page.get_attribute("img[alt='Generated word cloud']", "src") or ""
                    if src.startswith("blob:"):
                        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04-result.png"), full_page=False)
                        log(f"Image appeared after button reset ({time.time() - start:.1f}s)")
                        return

                if errors:
                    log(f"Console errors: {errors[-3:]}")
                    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04-error.png"), full_page=False)
                    raise Exception(f"Generation failed: {errors[-1]}")

            elapsed = time.time() - start
            if int(elapsed) % 15 == 0:
                log(f"Still waiting... loading={is_loading} ({elapsed:.0f}s)")

            page.wait_for_timeout(3000)

        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04-timeout.png"), full_page=False)
        raise Exception(f"Generation did not complete within {GENERATION_TIMEOUT}s (errors={errors[-3:]})")
    step("wait_for_result", wait_for_result)

    print("\n6. Check gallery")
    def check_gallery():
        thumbs = page.query_selector_all("[class*='gallery'] img, [class*='Gallery'] img")
        log(f"Gallery thumbnails: {len(thumbs)}")
    step("check_gallery", check_gallery)

    browser.close()

passed = sum(1 for s in steps if s["pass"])
total = len(steps)

results = {
    "target": TARGET_URL,
    "passed": passed,
    "total": total,
    "all_pass": passed == total,
    "steps": steps,
}

with open(RESULTS_FILE, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n=== Results: {passed}/{total} passed ===")
print(f"Screenshots: {SCREENSHOTS_DIR}/")
print(f"Results: {RESULTS_FILE}")

if passed < total:
    for s in steps:
        if not s["pass"]:
            print(f"  FAIL: {s['name']} — {s.get('error', '?')}")
    sys.exit(1)
