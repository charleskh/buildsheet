import { describe, it, expect } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import {
  manifestJson,
  feedJson,
  rssXml,
  feedItems,
  __testing as __feedTesting
} from '../../src/lib/export/feeds';
import type { SiteData } from '../../src/viewer/types';

function site(overrides: Partial<SiteData> = {}): SiteData {
  return {
    buildsheet: 1,
    name: 'Test Build',
    description: 'A description',
    startDate: '2020-01-01',
    author: 'Owner',
    siteUrl: 'https://example.test',
    links: [],
    coverImage: null,
    content: {
      version: 1,
      blocks: [
        {
          type: 'timeline',
          id: 'tl',
          header: 'Timeline',
          entries: [
            { date: 'March 2024', title: 'Axles under it', description: 'Dana 60' },
            { date: 'Spring 2019', title: 'Dragged it home' }
          ]
        }
      ]
    },
    images: [],
    generatedAt: '2026-09-25T00:00:00.000Z',
    ...overrides
  } as SiteData;
}

describe('feed items', () => {
  it('turns timeline entries into items, newest first', () => {
    const items = feedItems(site());
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Dragged it home');
    expect(items[1].title).toBe('Axles under it');
  });

  it('parses a month-and-year date and leaves an unparseable one undated', () => {
    const items = feedItems(site());
    // "Spring 2019" is a real answer a person gives, and inventing a day for it
    // would be worse than leaving it out.
    expect(items[0].date).toBeUndefined();
    expect(items[1].date).toContain('2024-03');
  });

  it('falls back to a single item when there is no timeline', () => {
    const items = feedItems(site({ content: { version: 1, blocks: [] } }));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test Build');
  });
});

describe('rssXml', () => {
  it('produces XML that actually parses', () => {
    const xml = rssXml(site());
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('item')).toHaveLength(2);
    expect(doc.getElementsByTagName('title')[0].textContent).toBe('Test Build');
  });

  it('escapes characters that would otherwise break the document', () => {
    const xml = rssXml(site({ name: 'Bob & Sons <"best"> builds' }));
    expect(xml).toContain('Bob &amp; Sons &lt;&quot;best&quot;&gt; builds');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('title')[0].textContent).toBe('Bob & Sons <"best"> builds');
  });
});

describe('feedJson and manifestJson', () => {
  it('makes feed addresses absolute when a site address is known', () => {
    const feed = JSON.parse(feedJson(site()));
    expect(feed.feed_url).toBe('https://example.test/feed.json');
    const manifest = JSON.parse(manifestJson(site()));
    expect(manifest.feeds.json).toBe('https://example.test/feed.json');
  });

  it('stays relative when the owner has not said where the site lives', () => {
    const feed = JSON.parse(feedJson(site({ siteUrl: '' })));
    expect(feed.feed_url).toBeUndefined();
    const manifest = JSON.parse(manifestJson(site({ siteUrl: '' })));
    expect(manifest.url).toBeUndefined();
    expect(manifest.feeds.rss).toBe('rss.xml');
  });
});

describe('parseDate', () => {
  const { parseDate } = __feedTesting;

  it('accepts dates that really are dates', () => {
    expect(parseDate('2024-03-15')).toContain('2024-03-15');
    expect(parseDate('2024-03')).toContain('2024-03');
    expect(parseDate('March 2024')).toContain('2024-03');
    expect(parseDate('Mar 2024')).toContain('2024-03');
    expect(parseDate('15 March 2024')).toContain('2024-03');
  });

  it('refuses vague periods rather than inventing a day for them', () => {
    // Date.parse("Spring 2019") returns 1 January 2019 instead of failing, so
    // trusting it would publish a precise date the person never gave.
    for (const vague of ['Spring 2019', 'Winter 2019', 'Summer of 2020', 'early 2021', 'someday']) {
      expect(parseDate(vague)).toBeUndefined();
    }
  });

  it('ignores an empty date', () => {
    expect(parseDate('')).toBeUndefined();
    expect(parseDate('   ')).toBeUndefined();
  });
});
