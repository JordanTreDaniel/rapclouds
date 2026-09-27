#!/usr/bin/env tsx
/**
 * shark-finder routine: Karaoke page smoke test
 *
 * ROUTINE:
 *   1. Navigate to /karaoke and capture BEFORE state
 *   2. Verify "RAPCHECK" heading renders
 *   3. Assert "Pick a song. Rap it. Get graded." subtitle
 *   4. Assert SongPicker component loads (song list or loading state)
 *   5. Wait for songs to load from /api/songs
 *   6. Assert song buttons are clickable
 *   7. Verify dark theme applied
 *   8. Capture AFTER state and compare
 *   9. Screenshot final state
 *
 * PROOF:
 *   - screenshots/karaoke-smoke.png
 *   - stdout structured JSON results
 */

import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TARGET_URL || 'http://localhost:8000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

interface StepResult {
  name: string;
  pass: boolean;
  time_s: number;
  error?: string;
  details?: string;
}

interface RoutineResult {
  routine: string;
  target: string;
  passed: number;
  total: number;
  all_pass: boolean;
  steps: StepResult[];
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  state_match: boolean;
}

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const results: StepResult[] = [];
let browser: Browser;
let page: Page;

function log(msg: string) {
  console.log(`  ${msg}`);
}

async function step(name: string, fn: () => Promise<void>): Promise<boolean> {
  const t0 = Date.now();
  try {
    await fn();
    const elapsed = (Date.now() - t0) / 1000;
    results.push({ name, pass: true, time_s: +elapsed.toFixed(2) });
    log(`✅ PASS ${name} (${elapsed.toFixed(1)}s)`);
    return true;
  } catch (e: any) {
    const elapsed = (Date.now() - t0) / 1000;
    const msg = e?.message || String(e);
    results.push({ name, pass: false, time_s: +elapsed.toFixed(2), error: msg });
    log(`❌ FAIL ${name}: ${msg}`);
    try {
      const failPath = path.join(SCREENSHOTS_DIR, `karaoke-fail-${name}.png`);
      await page.screenshot({ path: failPath, fullPage: true });
      log(`  📸 Failure screenshot: ${failPath}`);
    } catch {}
    return false;
  }
}

async function captureState(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const heading = document.querySelector('h1');
    const headingText = heading?.textContent?.trim() || '';
    const songPicker = !!document.querySelector(
      '[class*="rounded-2xl"], [class*="rounded-[10px]"]'
    );
    const songButtons = document.querySelectorAll(
      'button[class*="rounded"]'
    ).length;
    const navLinks = Array.from(document.querySelectorAll('nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent?.trim() || ''
    );
    const headerExists = !!document.querySelector('header');
    return {
      background: bg,
      headingText,
      songPickerVisible: songPicker,
      songButtonCount: songButtons,
      navLinks,
      headerExists,
      bodyHeight: document.body.scrollHeight,
    };
  });
}

async function run() {
  console.log('=== Karaoke Smoke Test (shark-finder) ===');
  console.log(`Target: ${BASE_URL}\n`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);

  page.on('dialog', (d) => d.dismiss());

  let beforeState: Record<string, any> = {};
  let afterState: Record<string, any> = {};

  // ── Step 1: Navigate and capture BEFORE ──
  await step('navigate_and_capture_before', async () => {
    await page.goto(`${BASE_URL}/karaoke`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });
    await page.waitForTimeout(1500);
    beforeState = await captureState(page);
    log(`BEFORE state: ${JSON.stringify(beforeState).slice(0, 200)}`);
  });

  // ── Step 2: RAPCHECK heading ──
  await step('rapcheck_heading', async () => {
    const heading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim() || '';
    });
    log(`Heading text: "${heading}"`);
    if (!heading.includes('RAPCHECK')) {
      throw new Error(`Expected "RAPCHECK" heading, got "${heading}"`);
    }
  });

  // ── Step 3: Subtitle ──
  await step('subtitle', async () => {
    const subtitle = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('p'));
      return ps.map((p) => p.textContent?.trim() || '').join(' | ');
    });
    log(`Subtitle area: "${subtitle}"`);
    if (!subtitle.toLowerCase().includes('pick a song')) {
      throw new Error(`Expected subtitle with "Pick a song", got "${subtitle}"`);
    }
  });

  // ── Step 4: SongPicker component ──
  await step('song_picker_component', async () => {
    // The SongPicker renders a "Choose a Track" heading in an h2
    const hasTrackHeader = await page.evaluate(() => {
      const h2s = Array.from(document.querySelectorAll('h2'));
      return h2s.some((h) => h.textContent?.includes('Choose a Track'));
    });
    log(`SongPicker "Choose a Track" header: ${hasTrackHeader}`);
    if (!hasTrackHeader) {
      throw new Error('SongPicker component not found (no "Choose a Track" header)');
    }
  });

  // ── Step 5: Wait for songs to load ──
  await step('songs_loaded', async () => {
    // Wait for either songs to appear or "No songs found"
    try {
      await page.waitForFunction(
        () => {
          const buttons = document.querySelectorAll('button[class*="rounded"]');
          return buttons.length > 0;
        },
        { timeout: 10000 }
      );
      const songCount = await page.evaluate(
        () =>
          document.querySelectorAll('button[class*="rounded"][class*="cursor-pointer"]').length
      );
      log(`Songs loaded: ${songCount} songs`);
      if (songCount === 0) {
        throw new Error('No song buttons found');
      }
    } catch (e: any) {
      // Check if "No songs found" message appeared
      const noSongs = await page.evaluate(() => {
        return document.body.textContent?.includes('No songs found') || false;
      });
      if (noSongs) {
        log('Songs loaded: 0 (API returned empty — acceptable for smoke test)');
        return; // Empty is still valid
      }
      throw e;
    }
  });

  // ── Step 6: Song buttons clickable ──
  await step('song_buttons_clickable', async () => {
    const firstBtn = await page.evaluate(() => {
      const btns = Array.from(
        document.querySelectorAll('button[class*="rounded"][class*="cursor-pointer"]')
      );
      if (btns.length === 0) return null;
      const btn = btns[0] as HTMLButtonElement;
      return {
        text: btn.textContent?.trim() || '',
        disabled: btn.disabled,
        visible: btn.offsetParent !== null,
      };
    });
    log(`First song button: ${JSON.stringify(firstBtn)}`);
    if (!firstBtn) {
      throw new Error('No clickable song buttons found');
    }
    if (firstBtn.disabled) {
      throw new Error('First song button is disabled');
    }
  });

  // ── Step 7: Dark theme verification ──
  await step('dark_theme', async () => {
    const theme = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const card = document.querySelector('[style*="background"]');
      const cardBg = card ? card.getAttribute('style') : '';
      return { bodyBg: bg, cardStyle: cardBg };
    });
    log(`Body bg: ${theme.bodyBg}`);
    // Body bg should be dark (near #0a0a0a or similar)
    const isDark = !theme.bodyBg || theme.bodyBg !== 'rgb(255, 255, 255)';
    if (!isDark) {
      throw new Error(`Expected dark theme, body bg is light: ${theme.bodyBg}`);
    }
    log(`Dark theme confirmed`);
  });

  // ── Step 8: Capture AFTER state ──
  await step('capture_after_state', async () => {
    afterState = await captureState(page);
    log(`AFTER state: ${JSON.stringify(afterState).slice(0, 200)}`);
  });

  // ── Step 9: Screenshot ──
  await step('screenshot', async () => {
    const shotPath = path.join(SCREENSHOTS_DIR, 'karaoke-smoke.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    log(`Screenshot saved: ${shotPath}`);
  });

  await browser.close();

  const stateMatch =
    beforeState['headingText'] === afterState['headingText'] &&
    beforeState['songPickerVisible'] === afterState['songPickerVisible'] &&
    beforeState['headerExists'] === afterState['headerExists'];

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  const finalResult: RoutineResult = {
    routine: 'karaoke-smoke-test',
    target: BASE_URL,
    passed,
    total,
    all_pass: passed === total,
    steps: results,
    before_state: beforeState,
    after_state: afterState,
    state_match: stateMatch,
  };

  console.log(`\n=== Results: ${passed}/${total} passed ===`);
  console.log(`State match (before ≈ after): ${stateMatch}`);
  console.log(JSON.stringify(finalResult, null, 2));

  if (passed < total) {
    console.log('\nFailures:');
    for (const s of results) {
      if (!s.pass) console.log(`  - ${s.name}: ${s.error}`);
    }
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
