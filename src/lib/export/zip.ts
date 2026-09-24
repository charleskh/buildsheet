/**
 * Minimal store-only ZIP writer.
 *
 * No dependency, no compression. Every file buildsheet writes is either already
 * compressed (JPEG) or tiny (JSON, HTML), so deflate would cost code size and
 * CPU to save almost nothing. Store-only keeps the single-file bundle small,
 * which matters because the whole app has to stay downloadable and offline.
 *
 * Format reference: PKWARE APPNOTE 4.3. No zip64, so a single archive must stay
 * under 4 GiB. A build that large is not a case this tool supports.
 */

import { asBlobPart } from '../bytes';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS packed time and date, which is what the ZIP header wants. */
function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  path: string;
  data: Uint8Array;
}

class ByteWriter {
  private parts: Uint8Array[] = [];
  length = 0;

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.length += bytes.length;
  }

  /** Little-endian scalar helpers. ZIP is little-endian throughout. */
  u16(value: number): void {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, value, true);
    this.push(b);
  }

  u32(value: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value >>> 0, true);
    this.push(b);
  }

  concat(): Uint8Array {
    const out = new Uint8Array(this.length);
    let offset = 0;
    for (const part of this.parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
}

/**
 * Build a ZIP archive from entries. Returns a Blob ready for a download link.
 *
 * Filenames are written as UTF-8 with the language-encoding flag set, so a
 * build named in any script survives the round trip through the archive.
 */
export function makeZip(entries: ZipEntry[], now = new Date()): Blob {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const body = new ByteWriter();
  const central = new ByteWriter();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const offset = body.length;

    // Local file header.
    body.u32(0x04034b50);
    body.u16(20); // version needed
    body.u16(0x0800); // flags: filename is UTF-8
    body.u16(0); // compression: store
    body.u16(time);
    body.u16(date);
    body.u32(crc);
    body.u32(entry.data.length); // compressed size equals uncompressed when stored
    body.u32(entry.data.length);
    body.u16(nameBytes.length);
    body.u16(0); // extra field length
    body.push(nameBytes);
    body.push(entry.data);

    // Matching central directory record.
    central.u32(0x02014b50);
    central.u16(20); // version made by
    central.u16(20); // version needed
    central.u16(0x0800);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(entry.data.length);
    central.u32(entry.data.length);
    central.u16(nameBytes.length);
    central.u16(0); // extra
    central.u16(0); // comment
    central.u16(0); // disk number start
    central.u16(0); // internal attributes
    central.u32(0); // external attributes
    central.u32(offset);
    central.push(nameBytes);
  }

  const centralBytes = central.concat();
  const bodyBytes = body.concat();

  const end = new ByteWriter();
  end.u32(0x06054b50);
  end.u16(0); // this disk
  end.u16(0); // disk with central directory
  end.u16(entries.length);
  end.u16(entries.length);
  end.u32(centralBytes.length);
  end.u32(bodyBytes.length);
  end.u16(0); // comment length

  return new Blob([asBlobPart(bodyBytes), asBlobPart(centralBytes), asBlobPart(end.concat())], {
    type: 'application/zip'
  });
}

/** Trigger a browser download. Works from file:// as well as over http. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers, so give it a beat.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const __testing = { crc32, dosDateTime };
