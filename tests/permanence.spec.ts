import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';

const MAKER = pathToFileURL(resolve('dist/index.html')).href;

async function attachPhoto(page: Page, inputIndex: number) {
  await page.evaluate(async (inputIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#7a4b1f';
    ctx.fillRect(0, 0, 1400, 1050);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob!], 'p.jpg', { type: 'image/jpeg' }));
    const input = document.querySelectorAll<HTMLInputElement>('input[type="file"][accept="image/*"]')[inputIndex];
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, inputIndex);
}

async function makeSmallBuild(page: Page, name: string) {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByPlaceholder('1978 F150 4x4').fill(name);
  await page.getByPlaceholder('Shown as the byline').fill('Owner');
  await attachPhoto(page, 0);
  await expect(page.locator('img.bs-cover')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add a section' }).click();
  await page.getByRole('button', { name: /^Text/ }).click();
  await page.getByPlaceholder('What happened, what you learned').fill('It took four years.');
}

test('a downloaded site can be loaded back in and edited', async ({ page, context }) => {
  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-reload-'));
  try {
    await page.goto(MAKER);
    await makeSmallBuild(page, 'Reload Test');

    await page.getByRole('button', { name: 'Publish' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my site' }).click();
    const zipPath = join(dir, 'site.zip');
    await (await downloadPromise).saveAs(zipPath);

    // Fresh page, as if the person came back weeks later on another machine.
    const second = await context.newPage();
    await second.goto(MAKER);
    await second.locator('input[type="file"][accept=".zip,application/zip"]').setInputFiles(zipPath);

    await expect(second.getByPlaceholder('1978 F150 4x4')).toHaveValue('Reload Test', { timeout: 20_000 });
    await expect(second.getByPlaceholder('Shown as the byline')).toHaveValue('Owner');
    await expect(second.getByPlaceholder('What happened, what you learned')).toHaveValue('It took four years.');
    await expect(second.locator('img.bs-cover')).toBeVisible();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('work in progress survives closing the tab', async ({ page, context }) => {
  // A silently broken autosave already shipped once, so watch for the warning
  // as well as for the outcome.
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));

  await page.goto(MAKER);
  await makeSmallBuild(page, 'Autosave Test');
  // Autosave debounces, so give it a moment to land in IndexedDB.
  await page.waitForTimeout(3000);
  await page.close({ runBeforeUnload: false });

  const second = await context.newPage();
  await second.goto(MAKER);
  await expect(second.locator('.bs-card.bs-highlight')).toContainText('Autosave Test', { timeout: 15_000 });
  await second.getByRole('button', { name: 'Pick up where I left off' }).click();
  await expect(second.getByPlaceholder('1978 F150 4x4')).toHaveValue('Autosave Test');
  await expect(second.locator('img.bs-cover')).toBeVisible();
  expect(warnings.filter((w) => w.includes('could not save'))).toEqual([]);
});

test('the single file archive opens on its own with images built in', async ({ page, context }) => {
  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-single-'));
  try {
    await page.goto(MAKER);
    await makeSmallBuild(page, 'Archive Test');
    await page.getByRole('button', { name: 'Publish' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.bs-extra-row', { hasText: 'A single file copy' }).getByRole('button').click();
    const archivePath = join(dir, 'archive.html');
    await (await downloadPromise).saveAs(archivePath);

    const viewer = await context.newPage();
    const errors: string[] = [];
    viewer.on('pageerror', (e) => errors.push(e.message));
    // Nothing may be fetched: everything has to be inside the file.
    await viewer.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );

    await viewer.goto(pathToFileURL(archivePath).href);
    await expect(viewer.locator('h1')).toHaveText('Archive Test');
    await expect(viewer.locator('body')).toContainText('It took four years.');

    const broken = await viewer.evaluate(() =>
      Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).length
    );
    expect(broken).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the maker saves a working copy of itself', async ({ page, context }) => {
  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-self-'));
  try {
    await page.goto(MAKER);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Publish' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('.bs-extra-row', { hasText: 'A copy of buildsheet itself' }).getByRole('button').click();
    const copyPath = join(dir, 'buildsheet.html');
    await (await downloadPromise).saveAs(copyPath);
    expect(statSync(copyPath).size).toBeGreaterThan(100_000);

    // The saved copy has to be a working application, not a picture of one.
    const copy = await context.newPage();
    const errors: string[] = [];
    copy.on('pageerror', (e) => errors.push(e.message));
    await copy.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );

    await copy.goto(pathToFileURL(copyPath).href);
    await copy.getByRole('button', { name: 'Start', exact: true }).click();
    await copy.getByPlaceholder('1978 F150 4x4').fill('Made In The Saved Copy');
    await copy.getByRole('button', { name: 'Preview' }).click();
    await copy.getByRole('button', { name: 'Build' }).click();
    await expect(copy.getByPlaceholder('1978 F150 4x4')).toHaveValue('Made In The Saved Copy');
    expect(errors).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
