import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, join, extname } from 'node:path';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';

const MAKER = pathToFileURL(resolve('dist/index.html')).href;

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.xml': 'application/rss+xml',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain'
};

/**
 * Serve an exported site over http.
 *
 * edit.html reads its own content/build.json, and a page opened from file://
 * cannot fetch a sibling file. Hosting is the environment this feature actually
 * runs in, so the test uses it.
 */
function serve(root: string): Promise<{ url: string; close: () => void }> {
  return new Promise((done) => {
    const server: Server = createServer((req, res) => {
      const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const file = join(root, path === '/' ? 'index.html' : path);
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      done({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

async function attachPhoto(page: Page, index: number) {
  await page.evaluate(async (index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c8562a';
    ctx.fillRect(0, 0, 1600, 1000);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob!], 'p.jpg', { type: 'image/jpeg' }));
    const input = document.querySelectorAll<HTMLInputElement>('input[type="file"][accept="image/*"]')[index];
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, index);
}

async function exportSite(page: Page, name: string, dir: string): Promise<string> {
  await page.goto(MAKER);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByPlaceholder('1978 F150 4x4').fill(name);
  await page.getByPlaceholder('Shown as the byline').fill('Owner');
  await attachPhoto(page, 0);
  await expect(page.locator('img.bs-cover')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Add a section' }).click();
  await page.getByRole('button', { name: /^Timeline/ }).click();
  await page.getByRole('button', { name: 'Add an entry' }).click();
  await page.getByPlaceholder('March 2024').fill('March 2024');
  await page.getByPlaceholder('What happened').fill('Axles under it');

  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByPlaceholder('https://my-build.pages.dev').fill('https://example.test');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my site' }).click();
  const zipPath = join(dir, 'site.zip');
  await (await downloadPromise).saveAs(zipPath);
  execFileSync('unzip', ['-q', zipPath, '-d', join(dir, 'site')]);
  return join(dir, 'site');
}

test('a published site can be edited from its own address', async ({ page, context }) => {
  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-edit-'));
  let server: { url: string; close: () => void } | undefined;
  try {
    const siteDir = await exportSite(page, 'Edit From Site', dir);
    expect(existsSync(join(siteDir, 'edit.html'))).toBe(true);
    server = await serve(siteDir);

    const site = await context.newPage();
    const errors: string[] = [];
    site.on('pageerror', (e) => errors.push(e.message));

    // The footer link is the discoverable route in.
    await site.goto(server.url);
    await expect(site.getByRole('link', { name: 'Edit this build' })).toBeVisible();
    await site.getByRole('link', { name: 'Edit this build' }).click();

    // The build loads straight from the page, with everything already in it.
    await expect(site.getByPlaceholder('1978 F150 4x4')).toHaveValue('Edit From Site', {
      timeout: 25_000
    });
    await expect(site.getByPlaceholder('Shown as the byline')).toHaveValue('Owner');
    await expect(site.locator('img.bs-cover')).toBeVisible();

    // It must be unmistakable that this is a copy and cannot touch the live page.
    const notice = site.locator('.bs-notice');
    await expect(notice).toContainText('editing a copy');
    await expect(notice).toContainText('own hosting');
    await expect(notice).toContainText('template');

    // And it must still be able to produce an updated site.
    await site.getByPlaceholder('1978 F150 4x4').fill('Edit From Site, updated');
    await site.getByRole('button', { name: 'Publish' }).click();
    const downloadPromise = site.waitForEvent('download');
    await site.getByRole('button', { name: 'Download my site' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('edit-from-site-updated-site.zip');

    expect(errors).toEqual([]);
  } finally {
    server?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the site describes itself for readers and aggregators', async ({ page, context }) => {
  const dir = mkdtempSync(join(tmpdir(), 'buildsheet-feeds-'));
  let server: { url: string; close: () => void } | undefined;
  try {
    const siteDir = await exportSite(page, 'Feed Test', dir);
    server = await serve(siteDir);

    const manifest = JSON.parse(readFileSync(join(siteDir, 'manifest.json'), 'utf8'));
    expect(manifest.buildsheet).toBe(1);
    expect(manifest.name).toBe('Feed Test');
    expect(manifest.author).toBe('Owner');
    expect(manifest.url).toBe('https://example.test');
    // A site address makes the feed addresses absolute, which readers need.
    expect(manifest.feeds.rss).toBe('https://example.test/rss.xml');

    const feed = JSON.parse(readFileSync(join(siteDir, 'feed.json'), 'utf8'));
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(feed.title).toBe('Feed Test');
    // Timeline entries are the update log, so they become the feed items.
    expect(feed.items[0].title).toBe('Axles under it');
    expect(feed.items[0].date_published).toContain('2024-03');

    const rss = readFileSync(join(siteDir, 'rss.xml'), 'utf8');
    expect(rss).toContain('<title>Feed Test</title>');
    expect(rss).toContain('Axles under it');

    // The feeds must be findable without being told where they are.
    const site = await context.newPage();
    await site.goto(server.url);
    const alternates = await site.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel="alternate"]')).map((l) => l.getAttribute('href'))
    );
    expect(alternates).toContain('feed.json');
    expect(alternates).toContain('rss.xml');
  } finally {
    server?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
