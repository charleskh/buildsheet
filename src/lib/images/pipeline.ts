/**
 * Browser-side image pipeline.
 *
 * seethespecs did this server-side in Go. buildsheet has no server, so every
 * resize happens on the user's own machine through canvas. This is the most
 * failure-prone part of the app: a phone with several hundred photos is the
 * case that runs out of memory, so work is done one image at a time and the
 * caller is told about progress after every single file.
 */

import { asBlobPart } from '../bytes';

/** Long-edge caps, mirroring the tiers seethespecs generates. */
export const TIERS = {
  full: { maxEdge: 2560, quality: 0.85 },
  mid: { maxEdge: 1200, quality: 0.82 },
  thumb: { maxEdge: 400, quality: 0.8 }
} as const;

export type TierName = keyof typeof TIERS;

export interface ProcessedImage {
  /** Locally assigned identifier. Keeps the block schema byte-compatible with seethespecs. */
  id: number;
  /** Original filename, sanitized, used to build the output paths. */
  baseName: string;
  /** Natural dimensions after orientation correction. */
  width: number;
  height: number;
  /** Rendered bytes per tier, keyed by tier name. */
  files: Record<TierName, { path: string; bytes: Uint8Array; width: number; height: number }>;
  /** Object URL for previewing in the editor. Revoke when the image is dropped. */
  previewUrl: string;
}

export interface ProgressReport {
  done: number;
  total: number;
  currentName: string;
}

/** Strip anything that would be awkward in a URL or on a strict filesystem. */
export function sanitizeBaseName(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'image';
}

function scaledSize(width: number, height: number, maxEdge: number): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { w: width, h: height };
  const ratio = maxEdge / longest;
  return { w: Math.round(width * ratio), h: Math.round(height * ratio) };
}

async function canvasToBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob) throw new Error('The browser could not encode this image.');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Decode one file and render every tier.
 *
 * `imageOrientation: 'from-image'` is what applies the EXIF rotation, so a
 * photo taken sideways on a phone comes out the right way up without us
 * parsing EXIF ourselves.
 */
export async function processOne(file: File, id: number): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`"${file.name}" could not be read as an image.`);
  }

  const baseName = sanitizeBaseName(file.name);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser does not support canvas rendering.');

  const files = {} as ProcessedImage['files'];
  for (const [tier, spec] of Object.entries(TIERS) as [TierName, (typeof TIERS)[TierName]][]) {
    const { w, h } = scaledSize(bitmap.width, bitmap.height, spec.maxEdge);
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    files[tier] = {
      path: `images/${id}-${baseName}-${tier}.jpg`,
      bytes: await canvasToBytes(canvas, spec.quality),
      width: w,
      height: h
    };
  }

  const result: ProcessedImage = {
    id,
    baseName,
    width: bitmap.width,
    height: bitmap.height,
    files,
    previewUrl: URL.createObjectURL(new Blob([asBlobPart(files.thumb.bytes)], { type: 'image/jpeg' }))
  };

  bitmap.close();
  // Collapse the canvas so the backing store is released before the next file.
  canvas.width = 0;
  canvas.height = 0;
  return result;
}

/**
 * Process a batch sequentially, reporting after each file.
 *
 * Sequential is deliberate. Running these in parallel decodes several full
 * resolution bitmaps at once, which is exactly how a phone browser gets killed.
 */
export async function processBatch(
  files: File[],
  startId: number,
  onProgress: (report: ProgressReport) => void,
  onError: (file: File, error: Error) => void
): Promise<ProcessedImage[]> {
  const out: ProcessedImage[] = [];
  let nextId = startId;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress({ done: i, total: files.length, currentName: file.name });
    try {
      out.push(await processOne(file, nextId));
      nextId++;
    } catch (error) {
      onError(file, error instanceof Error ? error : new Error(String(error)));
    }
    // Yield to the event loop so the progress indicator actually paints.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress({ done: files.length, total: files.length, currentName: '' });
  return out;
}

export const __testing = { scaledSize };
