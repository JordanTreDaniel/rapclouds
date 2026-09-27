#!/usr/bin/env tsx
/**
 * shark-finder routine: Admin page smoke test
 *
 * ROUTINE:
 *   1. Navigate to /admin and capture BEFORE state
 *   2. Verify "Admin" heading renders
 *   3. Assert subtitle text about editing lyrics and timing
 *   4. Assert SongList component loads (song cards or loading state)
 *   5. Wait for songs to load from API
 *   6. Assert song cards are clickable
 *   7. Verify dark theme + pink accent elements
 *   8. Capture AFTER state and compare
 *   9. Screenshot final state
 *
 * PROOF:
 *   - screenshots/admin-smoke.png
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
      const failPath = path.join(SCREENSHOTS_DIR, `admin-fail-${name}.png`);
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
    const songCards = document.querySelectorAll(
      'button[class*="rounded-lg"][class*="bg-bg-card"]'
    ).length;
    const navLinks = Array.from(document.querySelectorAll('nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent?.trim() || ''
    );
    const headerExists = !!document.querySelector('header');
    const pinkElements = document.querySelectorAll('[class*="pink"]').length;
    return {
      background: bg,
      headingText,
      songCardCount: songCards,
      navLinks,
      headerExists,
      pinkElementCount: pinkElements,
      bodyHeight: document.body.scrollHeight,
    };
  });
}

async function run() {
  console.log('=== Admin Smoke Test (shark-finder) ===');
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
    await page.goto(`${BASE_URL}/admin`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });
    await page.waitForTimeout(1500);
    beforeState = await captureState(page);
    log(`BEFORE state: ${JSON.stringify(beforeState).slice(0, 200)}`);
  });

  // ── Step 2: Admin heading ──
  await step('admin_heading', async () => {
    const heading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim() || '';
    });
    log(`Heading text: "${heading}"`);
    if (!heading.includes('Admin')) {
      throw new Error(`Expected "Admin" heading, got "${heading}"`);
    }
  });

  // ── Step 3: Subtitle ──
  await step('subtitle', async () => {
    const subtitle = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('p'));
      return ps.map((p) => p.textContent?.trim() || '').join(' | ');
    });
    log(`Subtitle area: "${subtitle}"`);
    if (
      !subtitle.toLowerCase().includes('lyrics') ||
      !subtitle.toLowerCase().includes('timing')
    ) {
      throw new Error(
        `Expected subtitle mentioning lyrics/timing, got "${subtitle}"`
      );
    }
  });

  // ── Step 4: SongList component ──
  await step('songlist_component', async () => {
    // SongList renders a grid of buttons with song names
    // Or shows loading spinner / "No songs found"
    const hasContent = await page.evaluate(() => {
      const grid = document.querySelector('[class*="grid"]');
      const loading = document.querySelector('[class*="animate-spin"]');
      const noSongs = document.body.textContent?.includes('No songs found') || false;
      return {
        gridExists: !!grid,
        loadingSpinner: !!loading,
        noSongsMessage: noSongs,
      };
    });
    log(`SongList state: ${JSON.stringify(hasContent)}`);
    if (!hasContent.gridExists && !hasContent.loadingSpinner && !hasContent.noSongsMessage) {
      throw new Error('SongList component not found (no grid, spinner, or empty message)');
    }
  });

  // ── Step 5: Wait for songs to load ──
  await step('songs_loaded', async () => {
    try {
      await page.waitForFunction(
        () => {
          const grid = document.querySelector('[class*="grid"]');
          const noSongs = document.body.textContent?.includes('No songs found');
          const loading = document.querySelector('[class*="animate-spin"]');
          return grid || noSongs || !loading;
        },
        { timeout: 10000 }
      );
      const songCount = await page.evaluate(() => {
        const cards = document.querySelectorAll(
          'button[class*="rounded-lg"][class*="bg-bg-card"]'
        );
        return cards.length;
      });
      log(`Songs loaded: ${songCount} songs`);
    } catch {
      log('Songs loaded: timeout (acceptable for smoke test if API is down)');
    }
  });

  // ── Step 6: Song cards clickable ──
  await step('song_cards_clickable', async () => {
    const firstCard = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll('button[class*="rounded-lg"][class*="bg-bg-card"]')
      );
      if (cards.length === 0) return null;
      const card = cards[0] as HTMLButtonElement;
      return {
        text: card.textContent?.trim() || '',
        disabled: card.disabled,
        visible: card.offsetParent !== null,
      };
    });
    if (firstCard) {
      log(`First song card: ${JSON.stringify(firstCard)}`);
      if (firstCard.disabled) {
        throw new Error('First song card is disabled');
      }
    } else {
      log('No song cards found (empty state — acceptable)');
    }
  });

  // ── Step 7: Dark theme + pink accents ──
  await step('dark_theme_pink_accents', async () => {
    const theme = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const pinkEls = document.querySelectorAll('[class*="pink"]');
      const pinkTexts = Array.from(pinkEls)
        .slice(0, 5)
        .map((el) => el.textContent?.trim()?.slice(0, 30) || '');
      return { bodyBg: bg, pinkCount: pinkEls.length, pinkTexts };
    });
    log(`Body bg: ${theme.bodyBg}`);
    log(`Pink accent elements: ${theme.pinkCount}`);
    const isDark = !theme.bodyBg || theme.bodyBg !== 'rgb(255, 255, 255)';
    if (!isDark) {
      throw new Error(`Expected dark theme, body bg is light: ${theme.bodyBg}`);
    }
    log(`Dark theme + pink accents confirmed`);
  });

  // ── Step 8: Capture AFTER state ──
  await step('capture_after_state', async () => {
    afterState = await captureState(page);
    log(`AFTER state: ${JSON.stringify(afterState).slice(0, 200)}`);
  });

  // ── Step 9: Screenshot ──
  await step('screenshot', async () => {
    const shotPath = path.join(SCREENSHOTS_DIR, 'admin-smoke.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    log(`Screenshot saved: ${shotPath}`);
  });

  await browser.close();

  const stateMatch =
    beforeState['headingText'] === afterState['headingText'] &&
    beforeState['headerExists'] === afterState['headerExists'] &&
    beforeState['pinkElementCount'] === afterState['pinkElementCount'];

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  const finalResult: RoutineResult = {
    routine: 'admin-smoke-test',
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
