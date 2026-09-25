/**
 * Load a published site into the editor, from the site itself.
 *
 * This is what `edit.html` does. The page fetches its own `content/build.json`
 * and photos from the same origin, so updating a build is "go to your site and
 * click Edit" rather than "find the zip you downloaded last year".
 *
 * Nothing is written back. The site is read, a copy is opened in this browser,
 * and publishing an update still means uploading to hosting the person controls.
 * That is why a visitor who is not the owner can open this harmlessly: they get
 * a copy to work from, which is a template, not a way in.
 */

import { build, type BuildMeta } from '$lib/state/build.svelte';
import { processOne, type ProcessedImage } from '$lib/images/pipeline';
import type { SiteData } from '../../viewer/types';

export class SiteLoadError extends Error {}

export interface SiteLoadProgress {
  done: number;
  total: number;
  message: string;
}

/** Where a published site keeps its data, relative to the page doing the asking. */
const DATA_PATH = 'content/build.json';

export async function loadFromCurrentSite(
  onProgress: (progress: SiteLoadProgress) => void
): Promise<{ imported: number; failed: number; data: SiteData }> {
  onProgress({ done: 0, total: 1, message: 'Reading this build' });

  let data: SiteData;
  try {
    const response = await fetch(new URL(DATA_PATH, location.href).href, { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    data = (await response.json()) as SiteData;
  } catch {
    throw new SiteLoadError(
      'Could not read this build. If you opened this file straight from your computer rather than from a web address, use the maker and load your zip instead.'
    );
  }

  if (data.buildsheet !== 1) {
    throw new SiteLoadError('This page was made by a version of buildsheet we do not understand.');
  }

  const images: ProcessedImage[] = [];
  let failed = 0;

  for (let i = 0; i < data.images.length; i++) {
    const record = data.images[i];
    onProgress({
      done: i,
      total: data.images.length,
      message: `Fetching photo ${i + 1} of ${data.images.length}`
    });
    try {
      const response = await fetch(new URL(record.url, location.href).href);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const name = record.url.split('/').pop() ?? `photo-${record.id}.jpg`;
      // Keep the ids the site already uses, so the block content needs no remapping.
      // The cover keeps its bytes so its framing stays adjustable. Note this is
      // the already-framed copy, not the untouched original, which the published
      // site does not carry: re-framing works within that, and replacing the
      // photo covers the rest.
      const isCover = Boolean(data.coverImage && record.url === data.coverImage.url);
      images.push(
        await processOne(new File([blob], name, { type: blob.type }), record.id, {
          keepSource: isCover
        })
      );
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const coverId =
    images.find((image) => data.coverImage && image.files.full.path === data.coverImage.url)?.id ??
    images[0]?.id ??
    null;

  const meta: BuildMeta = {
    name: data.name === 'Untitled build' ? '' : data.name,
    startDate: data.startDate ?? '',
    description: data.description ?? '',
    links: data.links ?? [],
    coverImageId: coverId,
    author: data.author ?? '',
    siteUrl: data.siteUrl ?? ''
  };

  build.load(meta, data.content.blocks, images);
  onProgress({ done: data.images.length, total: data.images.length, message: 'Ready' });
  return { imported: images.length, failed, data };
}

/** True when this copy of the maker was published alongside a build. */
export function isSiteEditor(): boolean {
  return document.body.dataset.buildsheetMode === 'edit-site';
}
