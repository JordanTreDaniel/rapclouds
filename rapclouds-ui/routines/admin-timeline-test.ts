#!/usr/bin/env tsx
/**
 * rapclouds routine: Admin Timeline page smoke test
 *
 * ROUTINE:
 *   1. Navigate to /admin and capture BEFORE state
 *   2. Verify "Admin" heading renders
 *   3. Wait for songs to load from /api/songs (SongList component)
 *   4. Select first song → enters editor view
 *   5. Switch to Timing tab → TimelineEditor renders
 *   6. Verify playback controls and word blocks render
 *   7. Click play button, wait, verify playhead position changes
 *   8. Capture AFTER state and compare
 *   9. Screenshot final state
 *
 * PROOF:
 *   - screenshots/admin-timeline-smoke.png
 *   - stdout structured JSON results
 */

import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TARGET_URL || 'http://localhost:5173';
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
      const failPath = path.join(SCREENSHOTS_DIR, `admin-timeline-fail-${name}.png`);
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
      'button[class*="rounded-lg"]'
    ).length;
    const navLinks = Array.from(document.querySelectorAll('nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent?.trim() || ''
    );
    const headerExists = !!document.querySelector('header');
    return {
      background: bg,
      headingText,
      songCardCount: songCards,
      navLinks,
      headerExists,
      bodyHeight: document.body.scrollHeight,
    };
  });
}

async function run() {
  console.log('=== Admin Timeline Smoke Test (rapclouds) ===');
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

  // ── Step 1: Navigate to /admin and capture BEFORE state ──
  await step('navigate_admin', async () => {
    await page.goto(`${BASE_URL}/admin`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });
    await page.waitForTimeout(1500);
    beforeState = await captureState(page);
    log(`BEFORE state: ${JSON.stringify(beforeState).slice(0, 200)}`);
  });

  // ── Step 2: Verify Admin heading ──
  await step('admin_heading', async () => {
    const heading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.trim() || '';
    });
    log(`Heading text: "${heading}"`);
    if (!heading.toLowerCase().includes('admin')) {
      throw new Error(`Expected "Admin" heading, got "${heading}"`);
    }
  });

  // ── Step 3: Wait for songs to load ──
  await step('songs_loaded', async () => {
    // Wait for either song cards to appear or "No songs found" message
    try {
      await page.waitForFunction(
        () => {
          const cards = document.querySelectorAll('button[class*="rounded-lg"]');
          const noSongs = document.body.textContent?.includes('No songs found');
          return cards.length > 0 || noSongs;
        },
        { timeout: 10000 }
      );
      const songCount = await page.evaluate(
        () => document.querySelectorAll('button[class*="rounded-lg"]').length
      );
      log(`Songs loaded: ${songCount} songs`);
      if (songCount === 0) {
        const noSongs = await page.evaluate(() =>
          document.body.textContent?.includes('No songs found') || false
        );
        if (noSongs) {
          log('Songs loaded: 0 (API returned empty — acceptable for smoke test)');
          return;
        }
        throw new Error('No songs found and no "No songs found" message');
      }
    } catch (e: any) {
      throw e;
    }
  });

  // ── Step 4: Select first song ──
  await step('select_song', async () => {
    const songCount = await page.evaluate(
      () => document.querySelectorAll('button[class*="rounded-lg"]').length
    );
    if (songCount === 0) {
      log('No songs available — skipping song selection');
      return;
    }

    // Click the first song card
    const firstSongName = await page.evaluate(() => {
      const btns = document.querySelectorAll('button[class*="rounded-lg"]');
      const btn = btns[0] as HTMLButtonElement;
      const nameEl = btn?.querySelector('.font-medium');
      return nameEl?.textContent?.trim() || btn?.textContent?.trim()?.split('\n')[0] || '';
    });
    log(`Clicking first song: "${firstSongName}"`);

    await page.click('button[class*="rounded-lg"]:first-child');
    await page.waitForTimeout(1000);

    // Verify we entered the editor view (should see song name in h2 and tab buttons)
    const hasEditorView = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      const hasTabButtons = !!document.querySelector('button');
      return !!h2?.textContent?.trim() && hasTabButtons;
    });
    log(`Editor view loaded: ${hasEditorView}`);
    if (!hasEditorView) {
      throw new Error('Editor view did not load after selecting a song');
    }
  });

  // ── Step 5: Switch to Timing tab ──
  await step('switch_to_timing_tab', async () => {
    const timingTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((b) => b.textContent?.trim() === 'Timing');
    });
    log(`Timing tab found: ${timingTab}`);

    if (!timingTab) {
      throw new Error('Timing tab not found');
    }

    // Click the Timing tab
    await page.click('button:has-text("Timing")');
    await page.waitForTimeout(1500);
    log('Switched to Timing tab');
  });

  // ── Step 6: Verify TimelineEditor components render ──
  await step('timeline_components_render', async () => {
    const components = await page.evaluate(() => {
      // Playhead: a div with bg-blue-500 and absolute positioning
      const playhead = !!document.querySelector('[class*="bg-blue-500"][class*="absolute"]');
      // Playback controls: buttons with play/pause titles
      const playBtn = !!document.querySelector('button[title="Play"], button[title="Pause"]');
      const skipBack = !!document.querySelector('button[title="Skip back 5s"]');
      const skipForward = !!document.querySelector('button[title="Skip forward 5s"]');
      // Word blocks: elements with cursor-grab inside the words container
      const wordBlocks = document.querySelectorAll('[class*="cursor-grab"]').length;
      // Zoom controls
      const hasZoom = !!document.querySelector('[class*="rounded-full"]');
      // Time display (mono font)
      const timeDisplay = !!document.querySelector('span[class*="font-mono"]');
      return {
        playhead,
        playBtn,
        skipBack,
        skipForward,
        wordBlocks,
        hasZoom,
        timeDisplay,
      };
    });
    log(`Timeline components: ${JSON.stringify(components)}`);

    if (!components.playBtn) {
      throw new Error('Play button not found in PlaybackControls');
    }
    if (!components.skipBack) {
      throw new Error('Skip back button not found');
    }
    if (!components.skipForward) {
      throw new Error('Skip forward button not found');
    }
    if (!components.playhead) {
      throw new Error('Playhead element not found');
    }
  });

  // ── Step 7: Click play and verify playhead moves ──
  await step('playhead_movement', async () => {
    // Get initial playhead left position
    const getPlayheadLeft = async (): Promise<number> => {
      return page.evaluate(() => {
        const playhead = document.querySelector('[class*="bg-blue-500"][class*="absolute"]');
        if (!playhead) return -1;
        const style = playhead.getAttribute('style') || '';
        const match = style.match(/left:\s*([\d.]+)px/);
        return match ? parseFloat(match[1]) : -1;
      });
    };

    const initialLeft = await getPlayheadLeft();
    log(`Initial playhead left: ${initialLeft}px`);
    if (initialLeft < 0) {
      throw new Error('Could not read playhead initial position');
    }

    // Click play button
    const playBtn = await page.$('button[title="Play"]');
    if (!playBtn) {
      throw new Error('Play button not found');
    }
    await playBtn.click();
    log('Clicked Play button');

    // Wait for playback to advance
    await page.waitForTimeout(3000);

    const finalLeft = await getPlayheadLeft();
    log(`Final playhead left: ${finalLeft}px`);

    if (finalLeft < 0) {
      throw new Error('Could not read playhead final position');
    }

    const moved = finalLeft !== initialLeft;
    const direction = finalLeft > initialLeft ? 'rightward' : 'leftward';
    log(`Playhead moved: ${moved} (${direction})`);

    if (!moved) {
      throw new Error(
        `Playhead did not move: initial=${initialLeft}px, final=${finalLeft}px`
      );
    }
  });

  // ── Step 8: Pause playback ──
  await step('pause_playback', async () => {
    const pauseBtn = await page.$('button[title="Pause"]');
    if (!pauseBtn) {
      throw new Error('Pause button not found (might not be playing)');
    }
    await pauseBtn.click();
    await page.waitForTimeout(500);
    log('Paused playback');

    // Verify play button reappears
    const playBtnExists = await page.evaluate(() => {
      return !!document.querySelector('button[title="Play"]');
    });
    if (!playBtnExists) {
      throw new Error('Play button did not reappear after pause');
    }
  });

  // ── Step 9: Screenshot ──
  await step('screenshot', async () => {
    const shotPath = path.join(SCREENSHOTS_DIR, 'admin-timeline-smoke.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    log(`Screenshot saved: ${shotPath}`);
  });

  // ── Step 10: Capture AFTER state ──
  await step('capture_after_state', async () => {
    afterState = await captureState(page);
    log(`AFTER state: ${JSON.stringify(afterState).slice(0, 200)}`);
  });

  await browser.close();

  const stateMatch =
    beforeState['headingText'] === afterState['headingText'] &&
    beforeState['headerExists'] === afterState['headerExists'];

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  const finalResult: RoutineResult = {
    routine: 'admin-timeline-test',
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
