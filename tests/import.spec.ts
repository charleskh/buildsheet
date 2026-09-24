import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const MAKER = pathToFileURL(resolve('dist/index.html')).href;

/** Produce real JPEG bytes once, using the browser, to serve from the mock CDN. */
async function jpegBytes(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2c5f8a';
    ctx.fillRect(0, 0, 1600, 1200);
    return canvas.toDataURL('image/jpeg', 0.85);
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/**
 * Mirrors the real seethespecs build 1: a spec list, a video block, and a
 * gallery whose id list is longer than the set of images that still exist. That
 * mismatch is real (104 ids against 65 rows on the live build) and is the case
 * most likely to put blank tiles on someone's finished page.
 */
const STS_BUILD = {
  id: 1,
  name: '1978 F150 4x4',
  start_date: '2017-10-10',
  description: 'Regular cab, short bed, 1-ton axles and 40 inch tires.',
  user_display_name: 'DaChy',
  tags: [{ display_name: 'Ford' }, { display_name: 'Rock crawler' }],
  content: JSON.stringify({
    version: 1,
    blocks: [
      {
        type: 'spec-list',
        id: 'block-a',
        header: 'Specifications',
        items: [{ key: 'Tires', value: '40 inch Krawlers' }]
      },
      { type: 'video', id: 'block-b', url: 'https://www.youtube.com/watch?v=-f8V5QgJtkA', header: '', caption: '' },
      // Two of these three ids have no surviving image row.
      { type: 'gallery', id: 'block-c', header: '1-Ton Axles', imageIds: [90, 999, 1000] }
    ]
  })
};

const STS_IMAGES = [{ id: 90, url: 'https://cdn.seethespecs.com/storage/v1/object/public/build-images/real.jpg' }];

test('imports a seethespecs build and drops references to images that no longer exist', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(MAKER);
  const photo = await jpegBytes(page);

  await context.route('**/api.seethespecs.com/build/1', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STS_BUILD) })
  );
  await context.route('**/api.seethespecs.com/build/1/images', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STS_IMAGES) })
  );
  await context.route('**/cdn.seethespecs.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/jpeg', body: photo })
  );

  await page.getByPlaceholder('seethespecs.com/builds/1').fill('https://seethespecs.com/builds/1');
  await page.getByRole('button', { name: 'Bring it over' }).click();

  // The build lands in the editor with its metadata intact.
  await expect(page.getByPlaceholder('1978 F150 4x4')).toHaveValue('1978 F150 4x4', { timeout: 20_000 });
  await expect(page.getByPlaceholder('Shown as the byline')).toHaveValue('DaChy');
  await expect(page.locator('.bs-tags')).toContainText('Ford');

  // The gallery editor reports the dangling references rather than rendering blanks.
  await expect(page.locator('.field-warning')).toContainText('2 photo references');

  // The video block survived, which the stale AGENTS.md block table omits entirely.
  await expect(page.getByPlaceholder('https://www.youtube.com/watch?v=...')).toHaveValue(
    'https://www.youtube.com/watch?v=-f8V5QgJtkA'
  );

  // Export must not carry the dead ids through to the finished page.
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.locator('.bs-summary')).toContainText('2 photo references');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my site' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('1978-f150-4x4-site.zip');

  expect(errors).toEqual([]);
});

test('reports a clear reason when the API will not talk to this origin', async ({ page, context }) => {
  await page.goto(MAKER);
  // What a CORS rejection looks like to the page: an opaque network failure.
  await context.route('**/api.seethespecs.com/**', (route) => route.abort('failed'));

  await page.getByPlaceholder('seethespecs.com/builds/1').fill('seethespecs.com/builds/1');
  await page.getByRole('button', { name: 'Bring it over' }).click();

  await expect(page.locator('.field-warning')).toContainText('not yet allowed to read the seethespecs API');
});

test('rejects something that is not a build address', async ({ page }) => {
  await page.goto(MAKER);
  await page.getByPlaceholder('seethespecs.com/builds/1').fill('not a url');
  await page.getByRole('button', { name: 'Bring it over' }).click();
  await expect(page.locator('.field-warning')).toContainText('Paste a build address');
});
