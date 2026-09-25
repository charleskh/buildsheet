/**
 * Load a site the person exported earlier so they can keep editing it.
 *
 * This is the whole editing story for the no-account path: load the zip, change
 * it, download it again. The build.json inside every exported site is what makes
 * it possible.
 */

import { readZip, UnsupportedZipError } from '$lib/export/unzip';
import { asBlobPart } from '$lib/bytes';
import { build, type BuildMeta } from '$lib/state/build.svelte';
import type { SiteData } from '../../viewer/types';
import type { ProcessedImage, TierName } from '$lib/images/pipeline';
import { processOne } from '$lib/images/pipeline';

function metaFrom(data: SiteData, coverId: number | null): BuildMeta {
  return {
    name: data.name === 'Untitled build' ? '' : data.name,
    startDate: data.startDate ?? '',
    description: data.description ?? '',
    links: data.links ?? [],
    siteUrl: data.siteUrl ?? '',
    coverImageId: coverId,
    author: data.author ?? ''
  };
}

/** Rebuild local image records from the files inside an exported archive. */
async function imagesFromEntries(
  data: SiteData,
  fileByPath: Map<string, Uint8Array>
): Promise<ProcessedImage[]> {
  const out: ProcessedImage[] = [];

  for (const record of data.images) {
    const paths: Record<TierName, string> = {
      full: record.url,
      mid: record.thumb2x_url ?? record.url,
      thumb: record.thumb_url ?? record.url
    };
    const full = fileByPath.get(paths.full);
    if (!full) continue; // the archive is missing this photo; skip rather than break the page

    // Re-derive the tiers from the full size copy. Trusting the stored tier files
    // would mean trusting their recorded dimensions too, and a half-copied folder
    // is a real case.
    const file = new File([asBlobPart(full)], paths.full.split('/').pop() ?? 'photo.jpg', {
      type: 'image/jpeg'
    });
    try {
      // The cover keeps its bytes so its framing stays adjustable after reloading.
      const isCover = Boolean(data.coverImage && paths.full === data.coverImage.url);
      out.push(await processOne(file, record.id, { keepSource: isCover }));
    } catch {
      // A photo that will not decode is left out rather than stopping the load.
    }
  }

  return out;
}

export async function loadFromZip(file: File): Promise<{ imported: number; skipped: number }> {
  let entries;
  try {
    entries = readZip(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof UnsupportedZipError) throw error;
    throw new UnsupportedZipError('That file could not be read as a buildsheet export.');
  }

  const byPath = new Map(entries.map((entry) => [entry.path, entry.bytes]));
  const jsonBytes = byPath.get('content/build.json');
  if (!jsonBytes) {
    throw new UnsupportedZipError(
      'That zip does not contain content/build.json, so it is not a buildsheet export.'
    );
  }

  const data = JSON.parse(new TextDecoder().decode(jsonBytes)) as SiteData;
  if (data.buildsheet !== 1) throw new UnsupportedZipError('That export is from a version we do not understand.');

  const images = await imagesFromEntries(data, byPath);
  const coverPath = data.coverImage?.url;
  const coverId = images.find((image) => image.files.full.path === coverPath)?.id ?? images[0]?.id ?? null;

  build.load(metaFrom(data, coverId), data.content.blocks, images);
  return { imported: images.length, skipped: data.images.length - images.length };
}
