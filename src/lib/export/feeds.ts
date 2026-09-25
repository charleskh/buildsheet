/**
 * Machine-readable descriptions of a build.
 *
 * A published site describes itself so a reader can follow it and an aggregator
 * can list it, without anything being sent from the maker and without the site
 * ever contacting anyone. Discovery is pull, never push.
 *
 * Three files, each doing a different job:
 *  - `manifest.json`  a small summary, cheap for an aggregator to poll
 *  - `feed.json`      JSON Feed, for readers
 *  - `rss.xml`        RSS 2.0, for everything older
 *
 * Timeline entries become feed items, because a timeline is the update log of a
 * build. A build with no timeline gets one item describing itself.
 */

import type { SiteData } from '../../viewer/types';
import type { TimelineBlock } from '$lib/features/blocks/types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Absolute when the owner told us where the site lives, relative otherwise. */
function resolve(siteUrl: string, path: string): string {
  if (!siteUrl) return path;
  const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

interface FeedItem {
  id: string;
  title: string;
  body: string;
  /** ISO date, when the entry's free-text date could be understood. */
  date?: string;
}

const MONTHS =
  'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

/**
 * Timeline dates are free text, because "Spring 2019" is a real answer.
 *
 * Do NOT hand these to Date.parse and trust the result. It is far too lenient:
 * `Date.parse("Spring 2019")` returns 1 January 2019 rather than failing,
 * because the engine ignores the word it does not understand and keeps the
 * year. A feed that turns "Spring 2019" into a precise date is publishing
 * something the person never said.
 *
 * So the shape is checked first, and anything that is not recognisably a date
 * is left undated. An undated item is honest; an invented one is not.
 */
function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const recognised = [
    // 2024-03-15 and 2024-03
    /^\d{4}-\d{2}(-\d{2})?$/,
    // 15/03/2024 and 3/15/24
    /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/,
    // 15 March 2024
    new RegExp(`^\\d{1,2}\\s+(${MONTHS})[a-z]*\\.?\\s+\\d{4}$`, 'i'),
    // March 2024, and March 15, 2024
    new RegExp(`^(${MONTHS})[a-z]*\\.?\\s+(\\d{1,2},?\\s+)?\\d{4}$`, 'i')
  ].some((pattern) => pattern.test(trimmed));

  if (!recognised) return undefined;

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

export const __testing = { parseDate };

export function feedItems(data: SiteData): FeedItem[] {
  const timelines = data.content.blocks.filter((b): b is TimelineBlock => b.type === 'timeline');
  const items: FeedItem[] = [];

  for (const block of timelines) {
    block.entries.forEach((entry, i) => {
      if (!entry.title?.trim() && !entry.description?.trim()) return;
      items.push({
        id: `${block.id}-${i}`,
        title: entry.title?.trim() || entry.date,
        body: [entry.date, entry.description?.trim()].filter(Boolean).join(' — ').replace(/—/g, '-'),
        date: parseDate(entry.date)
      });
    });
  }

  if (items.length === 0) {
    items.push({ id: 'build', title: data.name, body: data.description, date: data.generatedAt });
  }

  // Newest first, with undated entries after the dated ones so the order is stable.
  return items.reverse();
}

export function manifestJson(data: SiteData): string {
  return JSON.stringify(
    {
      buildsheet: 1,
      kind: 'build',
      name: data.name,
      description: data.description,
      author: data.author,
      startDate: data.startDate || undefined,
      url: data.siteUrl || undefined,
      cover: data.coverImage ? resolve(data.siteUrl ?? '', data.coverImage.mid) : undefined,
      photoCount: data.images.length,
      sectionCount: data.content.blocks.length,
      updated: data.generatedAt,
      links: data.links,
      feeds: {
        json: resolve(data.siteUrl ?? '', 'feed.json'),
        rss: resolve(data.siteUrl ?? '', 'rss.xml')
      }
    },
    null,
    2
  );
}

export function feedJson(data: SiteData): string {
  const site = data.siteUrl ?? '';
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: data.name,
      description: data.description || undefined,
      home_page_url: site || undefined,
      feed_url: site ? resolve(site, 'feed.json') : undefined,
      icon: data.coverImage ? resolve(site, data.coverImage.mid) : undefined,
      authors: data.author ? [{ name: data.author }] : undefined,
      items: feedItems(data).map((item) => ({
        id: site ? `${resolve(site, 'index.html')}#${item.id}` : item.id,
        url: site || undefined,
        title: item.title,
        content_text: item.body || item.title,
        date_published: item.date
      }))
    },
    null,
    2
  );
}

export function rssXml(data: SiteData): string {
  const site = data.siteUrl ?? '';
  const link = site || 'index.html';
  const items = feedItems(data)
    .map((item) => {
      const parts = [
        `      <title>${escapeXml(item.title)}</title>`,
        `      <description>${escapeXml(item.body || item.title)}</description>`,
        `      <guid isPermaLink="false">${escapeXml(`${data.name}-${item.id}`)}</guid>`
      ];
      if (item.date) parts.push(`      <pubDate>${new Date(item.date).toUTCString()}</pubDate>`);
      if (site) parts.push(`      <link>${escapeXml(site)}</link>`);
      return `    <item>\n${parts.join('\n')}\n    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(data.name)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(data.description || data.name)}</description>
    <generator>buildsheet</generator>
    <lastBuildDate>${new Date(data.generatedAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
