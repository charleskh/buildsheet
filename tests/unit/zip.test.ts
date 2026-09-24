import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeZip, __testing } from '../../src/lib/export/zip';

const { crc32 } = __testing;

describe('crc32', () => {
  it('matches the known value for "123456789"', () => {
    // The standard CRC-32 check vector. If this drifts, every archive is corrupt.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('is zero for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('makeZip', () => {
  it('produces an archive that the system unzip accepts and can extract', async () => {
    const enc = new TextEncoder();
    const entries = [
      { path: 'content/build.json', data: enc.encode('{"version":1,"blocks":[]}') },
      { path: 'index.html', data: enc.encode('<!doctype html><title>x</title>') },
      // Binary-ish payload with every byte value, to catch any text mangling.
      { path: 'images/1-photo-full.jpg', data: new Uint8Array(256).map((_, i) => i) }
    ];

    const blob = makeZip(entries);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const dir = mkdtempSync(join(tmpdir(), 'buildsheet-zip-'));
    const zipPath = join(dir, 'out.zip');
    writeFileSync(zipPath, bytes);

    try {
      // -t tests the archive integrity, including every CRC.
      const testOut = execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8' });
      expect(testOut).toContain('No errors detected');

      execFileSync('unzip', ['-q', zipPath, '-d', join(dir, 'x')]);
      expect(readFileSync(join(dir, 'x/content/build.json'), 'utf8')).toBe(
        '{"version":1,"blocks":[]}'
      );
      const img = readFileSync(join(dir, 'x/images/1-photo-full.jpg'));
      expect(img.length).toBe(256);
      expect(img[0]).toBe(0);
      expect(img[255]).toBe(255);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles an empty archive', async () => {
    const blob = makeZip([]);
    expect(blob.size).toBe(22); // end-of-central-directory record only
  });
});
