/**
 * Turns the current build into a finished website.
 *
 * The page template is the viewer build, inlined here as a string at compile
 * time. The data is substituted into it, so the exported site renders through
 * exactly the same components as the preview and cannot drift from what the
 * person approved before downloading.
 */

import viewerTemplate from '../../../dist-viewer/viewer.html?raw';
import { build, buildSlug, snapshot } from '$lib/state/build.svelte';
import type { SiteData } from '../../viewer/types';
import type { ContentBlock } from '$lib/features/blocks/types';
import { makeZip, type ZipEntry } from './zip';
import type { ProcessedImage } from '$lib/images/pipeline';

/** Escape for safe embedding inside a <script type="application/json"> tag. */
function escapeForScriptTag(json: string): string {
  return json.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Which images the finished site actually needs.
 *
 * Blocks can reference images that no longer exist. seethespecs build 1 has a
 * gallery listing 104 ids against 65 surviving rows, so shipping the id list
 * verbatim would put dead references in the output. Resolve against what is
 * really here, and drop images nothing points at so the zip stays lean.
 */
export function referencedImages(blocks: ContentBlock[], coverId: number | null): Set<number> {
  const wanted = new Set<number>();
  if (coverId !== null) wanted.add(coverId);
  for (const block of blocks) {
    if (block.type === 'image') wanted.add(block.imageId);
    if (block.type === 'gallery') for (const id of block.imageIds) wanted.add(id);
  }
  return wanted;
}

/** Strip block references to images that are not present, so the page renders clean. */
function pruneBlocks(blocks: ContentBlock[], present: Set<number>): ContentBlock[] {
  const out: ContentBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'gallery') {
      const ids = block.imageIds.filter((id) => present.has(id));
      if (ids.length === 0) continue; // an empty gallery is noise on the page
      out.push({
        ...block,
        imageIds: ids,
        coverImageId: block.coverImageId && ids.includes(block.coverImageId) ? block.coverImageId : undefined
      });
      continue;
    }
    if (block.type === 'image') {
      if (!present.has(block.imageId)) continue;
      out.push(block);
      continue;
    }
    out.push(block);
  }
  return out;
}

export interface SiteBundle {
  entries: ZipEntry[];
  data: SiteData;
  /** Rough size of everything, so the UI can warn before a huge download. */
  totalBytes: number;
  droppedImageRefs: number;
}

export function buildSite(): SiteBundle {
  const meta = build.meta;
  const allImages = build.images;
  const present = new Set(allImages.map((i) => i.id));

  const wanted = referencedImages(build.blocks, meta.coverImageId);
  const droppedImageRefs = [...wanted].filter((id) => !present.has(id)).length;
  const used = allImages.filter((image) => wanted.has(image.id));
  const blocks = pruneBlocks(snapshot(build.blocks) as ContentBlock[], present);

  const cover = meta.coverImageId !== null ? allImages.find((i) => i.id === meta.coverImageId) : undefined;

  const data: SiteData = {
    buildsheet: 1,
    name: meta.name || 'Untitled build',
    description: meta.description,
    startDate: meta.startDate,
    category: meta.category,
    author: meta.author,
    tags: [...meta.tags],
    coverImage: cover
      ? { url: cover.files.full.path, mid: cover.files.mid.path, thumb: cover.files.thumb.path }
      : null,
    content: { version: 1, blocks },
    images: used.map((image) => ({
      id: image.id,
      url: image.files.full.path,
      thumb_url: image.files.thumb.path,
      thumb2x_url: image.files.mid.path,
      width: image.files.full.width,
      height: image.files.full.height,
      description: ''
    })),
    generatedAt: new Date().toISOString()
  };

  const json = JSON.stringify(data);
  const html = viewerTemplate
    .replace(/__BUILDSHEET_TITLE__/g, escapeHtmlAttribute(data.name))
    .replace(/__BUILDSHEET_DESCRIPTION__/g, escapeHtmlAttribute(data.description))
    .replace('__BUILDSHEET_DATA__', escapeForScriptTag(json));

  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { path: 'index.html', data: encoder.encode(html) },
    { path: 'content/build.json', data: encoder.encode(JSON.stringify(data, null, 2)) },
    { path: 'README.txt', data: encoder.encode(readme(data.name)) }
  ];

  for (const image of used) {
    for (const file of Object.values(image.files)) {
      entries.push({ path: file.path, data: file.bytes });
    }
  }

  const totalBytes = entries.reduce((sum, entry) => sum + entry.data.length, 0);
  return { entries, data, totalBytes, droppedImageRefs };
}

export function siteZip(): { blob: Blob; filename: string; bundle: SiteBundle } {
  const bundle = buildSite();
  return {
    blob: makeZip(bundle.entries),
    filename: `${buildSlug(build.meta.name)}-site.zip`,
    bundle
  };
}

/**
 * A single self-contained HTML copy, for someone who wants the build on a drive
 * rather than at a URL. Images are inlined at the mid tier: inlining full size
 * turns a normal build into tens of megabytes of base64, which browsers open
 * badly.
 */
export function singleFileSite(): { blob: Blob; filename: string; bytes: number } {
  const bundle = buildSite();
  const byPath = new Map<string, ProcessedImage['files'][keyof ProcessedImage['files']]>();
  for (const image of build.images) {
    for (const file of Object.values(image.files)) byPath.set(file.path, file);
  }

  const toDataUri = (path: string): string => {
    const file = byPath.get(path);
    if (!file) return path;
    let binary = '';
    const bytes = file.bytes;
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  };

  // Point every tier at the mid-sized render so the file stays openable.
  const data: SiteData = {
    ...bundle.data,
    coverImage: bundle.data.coverImage
      ? {
          url: toDataUri(bundle.data.coverImage.mid),
          mid: toDataUri(bundle.data.coverImage.mid),
          thumb: toDataUri(bundle.data.coverImage.thumb)
        }
      : null,
    images: bundle.data.images.map((image) => ({
      ...image,
      url: toDataUri(image.thumb2x_url ?? image.url),
      thumb_url: toDataUri(image.thumb_url ?? image.url),
      thumb2x_url: toDataUri(image.thumb2x_url ?? image.url)
    }))
  };

  const html = viewerTemplate
    .replace(/__BUILDSHEET_TITLE__/g, escapeHtmlAttribute(data.name))
    .replace(/__BUILDSHEET_DESCRIPTION__/g, escapeHtmlAttribute(data.description))
    .replace('__BUILDSHEET_DATA__', escapeForScriptTag(JSON.stringify(data)));

  const blob = new Blob([html], { type: 'text/html' });
  return { blob, filename: `${buildSlug(build.meta.name)}.html`, bytes: blob.size };
}

function readme(name: string): string {
  return `${name}
${'='.repeat(name.length)}

This folder is a complete website. It is plain HTML, CSS and images, with no
server, no database and no account behind it.

To put it online
----------------
1. Go to cloudflare.com/drop
2. Drag this whole folder, or the zip it came in, onto the page.
3. You get a live web address straight away. No signup needed.
4. IMPORTANT: that first address only lasts one hour. Click "Claim" on the
   Cloudflare page to create a free account and keep it permanently.

To look at it on your own computer
----------------------------------
Open index.html in any web browser. It works offline.

To change it later
------------------
Open buildsheet again, choose "Load a site I made earlier", and give it the
content/build.json file from this folder. Edit, then download a new copy.

What is in here
---------------
index.html          the page itself, with your text built in
content/build.json  your build in a plain data file, used for editing later
images/             your photos, in three sizes

Made with buildsheet. charleskh.github.io/buildsheet
`;
}
