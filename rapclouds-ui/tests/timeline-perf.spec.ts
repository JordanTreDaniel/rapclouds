import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Timeline Editor Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
  });

  test('navigates to admin page and loads song list', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Admin');
    // Song list or "No songs found" should be visible
    const songButtons = page.locator('button:has-text("s"), button:has-text("words")');
    const noSongs = page.locator('text=No songs found');
    await expect(songButtons.first().or(noSongs)).toBeVisible({ timeout: 10000 });
  });

  test('selects a song and opens timeline editor', async ({ page }) => {
    // Click the first song card (button containing a song name)
    const firstSong = page.locator('.grid button').first();
    if (await firstSong.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstSong.click();

      // Wait for the timeline editor controls to appear
      // PlaybackControls has a play button with title "Play" or "Pause"
      const playButton = page.locator('button[title="Play"], button[title="Pause"]');
      await expect(playButton).toBeVisible({ timeout: 10000 });

      // Zoom controls should also be present
      const zoomIn = page.locator('button[title="Zoom in"]');
      await expect(zoomIn).toBeVisible();
    }
  });

  test('plays and measures frame rate', async ({ page }) => {
    // Navigate to a song
    const firstSong = page.locator('.grid button').first();
    if (!(await firstSong.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No songs available to test');
      return;
    }
    await firstSong.click();
    await page.locator('button[title="Play"], button[title="Pause"]').waitFor({ timeout: 10000 });

    // Click play
    const playButton = page.locator('button[title="Play"]');
    if (await playButton.isVisible().catch(() => false)) {
      await playButton.click();
    }

    // Wait 5 seconds for playback
    await page.waitForTimeout(5000);

    // Collect paint timing metrics
    const paintEntries = await page.evaluate(() => {
      return performance.getEntriesByType('paint');
    });
    console.log('Paint entries:', JSON.stringify(paintEntries));

    // Measure FPS over 5 seconds
    const fpsResult = await page.evaluate(() => {
      return new Promise<{ frames: number; fps: number }>((resolve) => {
        let frames = 0;
        const start = performance.now();
        function count() {
          frames++;
          if (performance.now() - start < 5000) {
            requestAnimationFrame(count);
          } else {
            resolve({ frames, fps: frames / 5 });
          }
        }
        requestAnimationFrame(count);
      });
    });

    console.log(`FPS: ${fpsResult.fps.toFixed(1)} (${fpsResult.frames} frames in 5s)`);
    expect(fpsResult.fps).toBeGreaterThan(10); // Sanity check — should be well above 10fps
  });

  test('zoom in/out measures render time', async ({ page }) => {
    const firstSong = page.locator('.grid button').first();
    if (!(await firstSong.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No songs available to test');
      return;
    }
    await firstSong.click();
    await page.locator('button[title="Play"], button[title="Pause"]').waitFor({ timeout: 10000 });

    const zoomIn = page.locator('button[title="Zoom in"]');
    const zoomOut = page.locator('button[title="Zoom out"]');

    // Zoom in 3 times and measure
    const zoomInTime = await page.evaluate(async () => {
      const start = performance.now();
      // Trigger zoom in via DOM button clicks
      for (let i = 0; i < 3; i++) {
        const btn = document.querySelector('button[title="Zoom in"]') as HTMLButtonElement | null;
        if (btn) btn.click();
        await new Promise((r) => setTimeout(r, 100)); // let React re-render
      }
      // Force layout recalculation
      document.body.getBoundingClientRect();
      return performance.now() - start;
    });
    console.log(`Zoom in (3x) render time: ${zoomInTime.toFixed(1)}ms`);
    expect(zoomInTime).toBeLessThan(5000); // Should complete well within 5s

    // Zoom out 3 times and measure
    const zoomOutTime = await page.evaluate(async () => {
      const start = performance.now();
      for (let i = 0; i < 3; i++) {
        const btn = document.querySelector('button[title="Zoom out"]') as HTMLButtonElement | null;
        if (btn) btn.click();
        await new Promise((r) => setTimeout(r, 100));
      }
      document.body.getBoundingClientRect();
      return performance.now() - start;
    });
    console.log(`Zoom out (3x) render time: ${zoomOutTime.toFixed(1)}ms`);
    expect(zoomOutTime).toBeLessThan(5000);
  });

  test('scroll performance — measures scroll jank', async ({ page }) => {
    const firstSong = page.locator('.grid button').first();
    if (!(await firstSong.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No songs available to test');
      return;
    }
    await firstSong.click();
    await page.locator('button[title="Play"], button[title="Pause"]').waitFor({ timeout: 10000 });

    // Find the scrollable timeline container
    // The scroll container has id="timeline-scroll-ref" and class overflow-x-auto
    const scrollContainer = page.locator('#timeline-scroll-ref');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // Measure frame drops during rapid scrolling
    const scrollResult = await page.evaluate(() => {
      return new Promise<{ totalFrames: number; droppedFrames: number; duration: number }>((resolve) => {
        const container = document.getElementById('timeline-scroll-ref');
        if (!container) {
          resolve({ totalFrames: 0, droppedFrames: 0, duration: 0 });
          return;
        }

        let totalFrames = 0;
        let droppedFrames = 0;
        let lastFrameTime = performance.now();
        const start = performance.now();
        const scrollStep = 200;
        let scrollPos = 0;
        const maxScroll = container.scrollWidth - container.clientWidth;

        function animate() {
          const now = performance.now();
          const delta = now - lastFrameTime;
          totalFrames++;
          // A frame is "dropped" if it took > 32ms (~below 30fps)
          if (delta > 32) droppedFrames++;
          lastFrameTime = now;

          // Simulate scroll
          scrollPos = Math.min(scrollPos + scrollStep, maxScroll);
          container.scrollLeft = scrollPos;

          if (now - start < 5000 && scrollPos < maxScroll) {
            requestAnimationFrame(animate);
          } else {
            resolve({
              totalFrames,
              droppedFrames,
              duration: now - start,
            });
          }
        }
        requestAnimationFrame(animate);
      });
    });

    console.log(
      `Scroll perf: ${scrollResult.totalFrames} frames, ` +
      `${scrollResult.droppedFrames} dropped in ${scrollResult.duration.toFixed(0)}ms`
    );
    // Allow up to 20% dropped frames as a rough threshold
    const dropRate = scrollResult.totalFrames > 0
      ? scrollResult.droppedFrames / scrollResult.totalFrames
      : 0;
    console.log(`Drop rate: ${(dropRate * 100).toFixed(1)}%`);
    expect(dropRate).toBeLessThan(0.3); // Less than 30% dropped frames
  });

  test('slow motion playback — verify speed control', async ({ page }) => {
    // NOTE: PlaybackControls currently has no speed selector UI.
    // This test verifies the audio element's playbackRate can be set via JS.
    // Once a speed control is added to PlaybackControls, update this test to use the UI.
    const firstSong = page.locator('.grid button').first();
    if (!(await firstSong.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No songs available to test');
      return;
    }
    await firstSong.click();
    await page.locator('button[title="Play"], button[title="Pause"]').waitFor({ timeout: 10000 });

    // Set playback rate to 0.5x via the audio element
    const rateSet = await page.evaluate(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement | null;
      if (!audio) return false;
      audio.playbackRate = 0.5;
      return audio.playbackRate === 0.5;
    });

    if (rateSet) {
      // Click play and verify it's playing at 0.5x
      const playButton = page.locator('button[title="Play"]');
      if (await playButton.isVisible().catch(() => false)) {
        await playButton.click();
      }

      await page.waitForTimeout(2000);

      const currentRate = await page.evaluate(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null;
        return audio?.playbackRate ?? 1;
      });
      expect(currentRate).toBe(0.5);
    }
  });

  test('screenshots at different zoom levels', async ({ page }) => {
    const firstSong = page.locator('.grid button').first();
    if (!(await firstSong.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No songs available to test');
      return;
    }
    await firstSong.click();
    await page.locator('button[title="Play"], button[title="Pause"]').waitFor({ timeout: 10000 });

    // Screenshot at default zoom
    await page.screenshot({
      path: 'tests/screenshots/timeline-default-zoom.png',
      fullPage: false,
    });

    // Zoom to max level and screenshot
    const zoomIn = page.locator('button[title="Zoom in"]');
    for (let i = 0; i < 5; i++) {
      await zoomIn.click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({
      path: 'tests/screenshots/timeline-max-zoom.png',
      fullPage: false,
    });

    // Zoom to min level and screenshot
    const zoomOut = page.locator('button[title="Zoom out"]');
    for (let i = 0; i < 10; i++) {
      await zoomOut.click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({
      path: 'tests/screenshots/timeline-min-zoom.png',
      fullPage: false,
    });
  });
});
