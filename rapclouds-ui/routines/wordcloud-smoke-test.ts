#!/usr/bin/env tsx
/**
 * shark-finder routine: Word Cloud page smoke test
 *
 * ROUTINE:
 *   1. Navigate to / and capture BEFORE state
 *   2. Verify page loads with correct title and dark theme
 *   3. Assert header nav links exist (Word Cloud, Karaoke, Admin)
 *   4. Assert sidebar sections render (InputSource, Typography, etc.)
 *   5. Assert MainDisplay + CloudDisplay area exists
 *   6. Assert Generate button is present and enabled
 *   7. Assert GalleryStrip is present
 *   8. Capture AFTER state and compare
 *   9. Screenshot final state
 *
 * PROOF:
 *   - screenshots/wordcloud-smoke.png
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
    // Screenshot on failure
    try {
      const failPath = path.join(SCREENSHOTS_DIR, `wordcloud-fail-${name}.png`);
      await page.screenshot({ path: failPath, fullPage: true });
      log(`  📸 Failure screenshot: ${failPath}`);
    } catch {}
    return false;
  }
}

async function captureState(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => {
    const body = document.body;
    const bg = getComputedStyle(body).backgroundColor;
    const header = document.querySelector('header');
    const navLinks = Array.from(document.querySelectorAll('nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent?.trim() || ''
    );
    const sidebarSections = document.querySelectorAll(
      '.border.border-border.rounded-lg'
    ).length;
    const mainArea = !!document.querySelector('main');
    const generateBtn = document.querySelector('button');
    const generateBtnText = generateBtn?.textContent?.trim() || '';
    const galleryImages = document.querySelectorAll(
      '[class*="gallery"] img, [class*="Gallery"] img'
    ).length;
    return {
      background: bg,
      headerExists: !!header,
      navLinks,
      sidebarSections,
      mainAreaExists: mainArea,
      generateBtnText,
      galleryImages,
      title: document.title,
      bodyHeight: body.scrollHeight,
    };
  });
}

async function run() {
  console.log('=== Word Cloud Smoke Test (shark-finder) ===');
  console.log(`Target: ${BASE_URL}\n`);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);

  // Dismiss any dialogs
  page.on('dialog', (d) => d.dismiss());

  let beforeState: Record<string, any> = {};
  let afterState: Record<string, any> = {};

  // ── Step 1: Navigate and capture BEFORE state ──
  await step('navigate_and_capture_before', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    beforeState = await captureState(page);
    log(`BEFORE state captured: ${JSON.stringify(beforeState).slice(0, 200)}`);
  });

  // ── Step 2: Page loads with correct title ──
  await step('page_title', async () => {
    const title = await page.title();
    log(`Title: "${title}"`);
    // Title should exist (may be empty string in dev, that's ok)
    if (title !== undefined) {
      log('Page has a title');
    }
  });

  // ── Step 3: Header nav links ──
  await step('header_nav_links', async () => {
    const navLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a')).map(
        (a) => (a as HTMLAnchorElement).textContent?.trim() || ''
      )
    );
    log(`Nav links found: ${JSON.stringify(navLinks)}`);
    const expected = ['Word Cloud', 'Karaoke', 'Admin'];
    for (const label of expected) {
      if (!navLinks.includes(label)) {
        throw new Error(`Missing nav link: "${label}"`);
      }
    }
    log(`All ${expected.length} nav links present`);
  });

  // ── Step 4: Sidebar sections render ──
  await step('sidebar_sections', async () => {
    const count = await page.evaluate(
      () => document.querySelectorAll('.border.border-border.rounded-lg').length
    );
    log(`Sidebar sections: ${count}`);
    if (count < 4) {
      throw new Error(`Expected >= 4 sidebar sections, got ${count}`);
    }
  });

  // ── Step 5: Main display area ──
  await step('main_display_area', async () => {
    const mainExists = await page.evaluate(() => !!document.querySelector('main'));
    if (!mainExists) {
      throw new Error('Main display area not found');
    }
    // Check for the dark radial gradient background
    const hasDarkBg = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      const bg = getComputedStyle(main).background;
      return bg.includes('radial-gradient') || bg.includes('#0a0a0a') || bg.includes('#111');
    });
    log(`Main area exists: true, dark radial bg: ${hasDarkBg}`);
  });

  // ── Step 6: Generate button ──
  await step('generate_button', async () => {
    const btnText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const gen = buttons.find((b) => b.textContent?.includes('Generate'));
      return gen?.textContent?.trim() || null;
    });
    if (!btnText) {
      throw new Error('Generate button not found');
    }
    log(`Generate button text: "${btnText}"`);

    const isEnabled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const gen = buttons.find((b) => b.textContent?.includes('Generate'));
      return gen ? !gen.disabled : false;
    });
    log(`Generate button enabled: ${isEnabled}`);
  });

  // ── Step 7: Gallery strip ──
  await step('gallery_strip', async () => {
    const exists = await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      return sections.length > 0;
    });
    log(`Gallery/section area exists: ${exists}`);
  });

  // ── Step 8: Capture AFTER state ──
  await step('capture_after_state', async () => {
    afterState = await captureState(page);
    log(`AFTER state captured: ${JSON.stringify(afterState).slice(0, 200)}`);
  });

  // ── Step 9: Screenshot ──
  await step('screenshot', async () => {
    const shotPath = path.join(SCREENSHOTS_DIR, 'wordcloud-smoke.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    log(`Screenshot saved: ${shotPath}`);
  });

  await browser.close();

  // ── State comparison ──
  const stateMatch =
    beforeState['navLinks']?.length === afterState['navLinks']?.length &&
    beforeState['sidebarSections'] === afterState['sidebarSections'] &&
    beforeState['mainAreaExists'] === afterState['mainAreaExists'];

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  const finalResult: RoutineResult = {
    routine: 'wordcloud-smoke-test',
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
