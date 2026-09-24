/**
 * Reader for the archives buildsheet writes.
 *
 * Only stored (uncompressed) entries are supported, which is all our own writer
 * produces, so no inflate implementation is needed. A zip made by something else
 * will usually be deflated, and that case is reported clearly rather than
 * failing with garbage.
 */

export interface ReadEntry {
  path: string;
  bytes: Uint8Array;
}

export class UnsupportedZipError extends Error {}

export function readZip(buffer: ArrayBuffer): ReadEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Find the end-of-central-directory record, scanning back over any comment.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 22 - 0xffff; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new UnsupportedZipError('That file does not look like a zip archive.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ReadEntry[] = [];
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new UnsupportedZipError('This archive is damaged or in a format we cannot read.');
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (method !== 0) {
      throw new UnsupportedZipError(
        'This zip is compressed. Use the original zip buildsheet gave you, or pick the content/build.json file instead.'
      );
    }

    // Jump to the local header to find where the data actually starts. The
    // local header's own name and extra lengths can differ from the central ones.
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;

    if (!path.endsWith('/')) {
      entries.push({ path, bytes: bytes.subarray(dataStart, dataStart + compressedSize) });
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
