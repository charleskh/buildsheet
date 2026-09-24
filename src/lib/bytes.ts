/**
 * TypeScript 5.7 made Uint8Array generic over its backing buffer, and BlobPart
 * only accepts ArrayBuffer-backed views. Every array in this project comes from
 * an ArrayBuffer, so the narrowing is safe and lives in one place rather than
 * being scattered through call sites.
 */
export function asBlobPart(bytes: Uint8Array): BlobPart {
  return bytes as unknown as BlobPart;
}
