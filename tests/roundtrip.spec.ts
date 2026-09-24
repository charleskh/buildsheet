import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const MAKER = pathToFileURL(resolve('dist/index.html')).href;

/**
 * Put a generated photo into a file input from inside the page.
 *
 * Building the image in the browser rather than shipping a fixture keeps the
 * test honest about the real path: a large photo that has to be decoded and
 * resized, not a 1x1 placeholder.
 */
async function attachPhoto(page: Page, inputIndex: number, width = 3000, height = 2000) {
  await page.evaluate(
    async ({ inputIndex, width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#c8562a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width / 4, height / 4, width / 2, height / 2);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      const file = new File([blob!], `photo-${inputIndex}.jpg`, { type: 'image/jpeg' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"][accept="image/*"]');
      const input = inputs[inputIndex];
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { inputIndex, width, height }
  );
}

test('a build made in the maker exports to a site that renders offline', async ({ page, context }) => {
  // Nothing may touch the network at any point in this flow.
  // file://, blob: and data: are the page's own resources. Anything else is a
  // real network call, and there must not be one.
  await context.route('**/*', (route) => {
    const url = route.request().url();
    const local = url.startsWith('file://') || url.startsWith('blob:') || url.startsWith('data:');
    return local ? route.continue() : route.abort();
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(MAKER);
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  // ---- build details
  await page.getByPlaceholder('1978 F150 4x4').fill('1974 Bronco');
  await page.getByPlaceholder('Regular cab, short bed').fill('Uncut rear quarters, 302, three speed.');
  await page.getByPlaceholder('Shown as the byline').fill('Test Owner');

  // Cover photo is the first image input on the page.
  await attachPhoto(page, 0);
  await expect(page.locator('img.cover')).toBeVisible({ timeout: 15_000 });

  // ---- a spec list
  await page.getByRole('button', { name: 'Add a section' }).click();
  await page.getByRole('button', { name: /^Spec list/ }).click();
  await page.getByRole('button', { name: 'Add a row' }).click();
  await page.getByPlaceholder('Part').fill('Engine');
  await page.getByPlaceholder('What it is').fill('302 Windsor');
  await page.getByPlaceholder('Price').fill('$2,400');

  // ---- a gallery with two photos
  await page.getByRole('button', { name: 'Add a section' }).click();
  await page.getByRole('button', { name: /^Gallery/ }).click();
  const galleryInputIndex = 1; // cover picker is 0, the gallery picker follows
  await attachPhoto(page, galleryInputIndex, 2000, 1500);
  await expect(page.locator('.grid figure')).toHaveCount(1, { timeout: 15_000 });

  // ---- preview renders through the same components the export uses
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('.preview-pane')).toContainText('302 Windsor');

  // ---- export
  await page.getByRole('button', { name: 'Publish' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my site' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('1974-bronco-site.zip');

  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-e2e-'));
  try {
    const zipPath = join(dir, 'site.zip');
    await download.saveAs(zipPath);

    // The archive must be valid to a real tool, not just to our own reader.
    expect(execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8' })).toContain('No errors detected');
    execFileSync('unzip', ['-q', zipPath, '-d', join(dir, 'site')]);

    const siteDir = join(dir, 'site');
    expect(existsSync(join(siteDir, 'index.html'))).toBe(true);
    expect(existsSync(join(siteDir, 'content/build.json'))).toBe(true);
    expect(existsSync(join(siteDir, 'README.txt'))).toBe(true);

    const data = JSON.parse(readFileSync(join(siteDir, 'content/build.json'), 'utf8'));
    expect(data.buildsheet).toBe(1);
    expect(data.name).toBe('1974 Bronco');
    expect(data.author).toBe('Test Owner');
    expect(data.images).toHaveLength(2); // cover plus the one gallery photo
    expect(data.content.blocks.some((b: { type: string }) => b.type === 'spec-list')).toBe(true);

    // ---- the generated site opens on its own, offline, with images resolving
    const sitePage = await context.newPage();
    const siteErrors: string[] = [];
    sitePage.on('pageerror', (e) => siteErrors.push(e.message));

    await sitePage.goto(pathToFileURL(join(siteDir, 'index.html')).href);
    await expect(sitePage.locator('h1')).toHaveText('1974 Bronco');
    await expect(sitePage.locator('body')).toContainText('302 Windsor');
    await expect(sitePage.locator('body')).toContainText('Test Owner');
    await expect(sitePage.locator('body')).toContainText('Made with');

    // Every image on the finished page must actually load from disk.
    const broken = await sitePage.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute('src') ?? '(no src)')
    );
    expect(broken).toEqual([]);
    expect(siteErrors).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  expect(pageErrors).toEqual([]);
});
