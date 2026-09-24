/**
 * In-page self test.
 *
 * Phase 0 of the design is a gate: prove that a Svelte build inlined into one
 * HTML file can still decode an image, resize it on canvas and produce a valid
 * archive when opened from file:// with no server. Everything about the
 * permanence plan depends on that being true.
 *
 * Exposing it on window lets the end-to-end test drive it without fighting
 * browser download plumbing, and it doubles as a diagnostic a user can run if
 * their browser is doing something strange.
 */

import { processOne } from './images/pipeline';
import { makeZip } from './export/zip';

export interface SelfTestResult {
  ok: boolean;
  protocol: string;
  canvas: boolean;
  createImageBitmap: boolean;
  tiers: Record<string, { bytes: number; width: number; height: number }>;
  zipBytes: number;
  zipSignature: string;
  error?: string;
}

/** Paint a recognisable test image so the resize has real content to work on. */
async function syntheticPhoto(width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1b1b1b');
  gradient.addColorStop(1, '#c8562a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(height / 8)}px sans-serif`;
  ctx.fillText('buildsheet', width / 12, height / 2);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  );
  if (!blob) throw new Error('toBlob returned nothing');
  return new File([blob], 'self-test-photo.jpg', { type: 'image/jpeg' });
}

export async function runSelfTest(): Promise<SelfTestResult> {
  const result: SelfTestResult = {
    ok: false,
    protocol: location.protocol,
    canvas: typeof document.createElement('canvas').getContext === 'function',
    createImageBitmap: typeof createImageBitmap === 'function',
    tiers: {},
    zipBytes: 0,
    zipSignature: ''
  };

  try {
    const file = await syntheticPhoto(3000, 2000);
    const processed = await processOne(file, 1);

    for (const [tier, data] of Object.entries(processed.files)) {
      result.tiers[tier] = { bytes: data.bytes.length, width: data.width, height: data.height };
    }

    const zip = makeZip([
      { path: 'content/build.json', data: new TextEncoder().encode('{"version":1,"blocks":[]}') },
      ...Object.values(processed.files).map((f) => ({ path: f.path, data: f.bytes }))
    ]);

    const head = new Uint8Array(await zip.slice(0, 4).arrayBuffer());
    result.zipBytes = zip.size;
    result.zipSignature = Array.from(head)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    URL.revokeObjectURL(processed.previewUrl);

    // 504b0304 is the local file header signature every reader looks for.
    result.ok =
      result.zipSignature === '504b0304' &&
      result.tiers.full?.width === 2560 &&
      result.tiers.thumb?.width === 400 &&
      result.zipBytes > 1000;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

declare global {
  interface Window {
    __buildsheetSelfTest?: () => Promise<SelfTestResult>;
  }
}

export function registerSelfTest(): void {
  window.__buildsheetSelfTest = runSelfTest;
}
