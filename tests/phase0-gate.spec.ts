import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const FILE_URL = pathToFileURL(resolve('dist/index.html')).href;

test.describe('Phase 0 gate: the single file works with no server', () => {
  test('loads from file:// and renders', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('h1')).toHaveText('buildsheet');
    expect(page.url().startsWith('file://')).toBe(true);
  });

  test('resizes a photo and writes a valid archive, offline', async ({ page, context }) => {
    // Block every network request. If the page needs the network it fails here.
    await context.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );

    await page.goto(FILE_URL);
    const result = await page.evaluate(() => window.__buildsheetSelfTest!());

    expect(result.error).toBeUndefined();
    expect(result.protocol).toBe('file:');
    expect(result.canvas).toBe(true);
    expect(result.createImageBitmap).toBe(true);

    // Tiers came out at the documented long-edge caps.
    expect(result.tiers.full.width).toBe(2560);
    expect(result.tiers.mid.width).toBe(1200);
    expect(result.tiers.thumb.width).toBe(400);

    // 504b0304 is the ZIP local file header signature.
    expect(result.zipSignature).toBe('504b0304');
    expect(result.zipBytes).toBeGreaterThan(1000);
    expect(result.ok).toBe(true);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(FILE_URL);
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
