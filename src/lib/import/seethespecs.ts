/**
 * Import an existing build from seethespecs.
 *
 * This is the migration path, and it only works while the seethespecs API is
 * still running. After that, people import the zip they already downloaded.
 *
 * Two things were verified against the live service on 2026-09-24:
 *  - the image CDN sends `access-control-allow-origin: *`, so photos can be
 *    pulled straight into the browser with no cooperation from anyone.
 *  - the API is origin locked, so this only works once the maker's origin is in
 *    the API's CORS_ALLOWED_ORIGINS. That is a configuration change on the
 *    seethespecs side, not something this code can work around.
 */

import { build, type BuildMeta } from '$lib/state/build.svelte';
import { processOne, type ProcessedImage } from '$lib/images/pipeline';
import { parseBlockContent } from '$lib/features/blocks/types';

const DEFAULT_API = 'https://api.seethespecs.com';

export class ImportBlockedError extends Error {}

interface StsBuild {
  id: number;
  name: string;
  start_date?: string;
  description?: string;
  content?: string;
  user_display_name?: string;
  image_url?: string;
}

interface StsImage {
  id: number;
  url: string;
}

export interface ImportProgress {
  stage: 'metadata' | 'photos' | 'done';
  done: number;
  total: number;
  message: string;
}

/** Pull the numeric build id out of whatever the person pasted. */
export function parseBuildRef(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/\/builds\/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    // A CORS rejection surfaces as a generic network failure, so say what is
    // most likely rather than pretending to know.
    throw new ImportBlockedError(
      'Could not reach seethespecs. Either you are offline, or this maker is not yet allowed to read the seethespecs API.'
    );
  }
  if (response.status === 404) throw new ImportBlockedError('No public build with that number.');
  if (!response.ok) throw new ImportBlockedError(`seethespecs replied with ${response.status}.`);
  return (await response.json()) as T;
}

export async function importFromSeeTheSpecs(
  ref: string,
  onProgress: (progress: ImportProgress) => void,
  apiBase = DEFAULT_API
): Promise<{ imported: number; failed: number; danglingRefs: number }> {
  const id = parseBuildRef(ref);
  if (id === null) {
    throw new ImportBlockedError('Paste a build address like seethespecs.com/builds/1.');
  }

  onProgress({ stage: 'metadata', done: 0, total: 1, message: 'Reading the build' });
  const stsBuild = await getJson<StsBuild>(`${apiBase}/build/${id}`);
  const stsImages = await getJson<StsImage[]>(`${apiBase}/build/${id}/images`);

  const content = parseBlockContent(stsBuild.content ?? '');

  // Keep the seethespecs image ids as our own. They are already unique numbers,
  // and reusing them means the block content imports without any remapping.
  const images: ProcessedImage[] = [];
  let failed = 0;

  for (let i = 0; i < stsImages.length; i++) {
    const record = stsImages[i];
    onProgress({
      stage: 'photos',
      done: i,
      total: stsImages.length,
      message: `Fetching and resizing photo ${i + 1} of ${stsImages.length}`
    });
    try {
      const response = await fetch(record.url);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const name = record.url.split('/').pop() ?? `photo-${record.id}.jpg`;
      // Re-render the tiers locally rather than trusting the stored thumbnails.
      // Some older rows have empty thumbnail URLs, and this makes every image
      // consistent regardless.
      images.push(await processOne(new File([blob], name, { type: blob.type }), record.id));
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const present = new Set(images.map((image) => image.id));
  let danglingRefs = 0;
  for (const block of content.blocks) {
    if (block.type === 'gallery') danglingRefs += block.imageIds.filter((id) => !present.has(id)).length;
    if (block.type === 'image' && !present.has(block.imageId)) danglingRefs++;
  }

  // The cover on seethespecs is a separate URL rather than a gallery row, so the
  // nearest sensible cover is the first photo we managed to bring across.
  const meta: BuildMeta = {
    name: stsBuild.name ?? '',
    startDate: stsBuild.start_date ?? '',
    description: stsBuild.description ?? '',
    links: [],
    siteUrl: '',
    coverImageId: images[0]?.id ?? null,
    author: stsBuild.user_display_name ?? ''
  };

  build.load(meta, content.blocks, images);
  onProgress({ stage: 'done', done: stsImages.length, total: stsImages.length, message: 'Done' });

  return { imported: images.length, failed, danglingRefs };
}
