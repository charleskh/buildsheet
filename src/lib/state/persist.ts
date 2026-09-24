/**
 * Work-in-progress autosave.
 *
 * Someone spends an hour captioning photos and then closes the tab. Without
 * this, that hour is gone, and there is no server to have saved it for them.
 * IndexedDB is used rather than localStorage because the image bytes run to
 * tens of megabytes, far past what localStorage will hold.
 *
 * Every access is wrapped, because storage can be unavailable or denied in a
 * private window and the app has to keep working when it is.
 */

import type { ContentBlock } from '$lib/features/blocks/types';
import type { ProcessedImage, TierName } from '$lib/images/pipeline';
import { build, snapshot, type BuildMeta } from './build.svelte';
import { asBlobPart } from '$lib/bytes';

const DB_NAME = 'buildsheet';
const DB_VERSION = 1;
const STORE = 'drafts';
const KEY = 'current';

interface StoredImage {
  id: number;
  baseName: string;
  width: number;
  height: number;
  files: Record<TierName, { path: string; bytes: Uint8Array; width: number; height: number }>;
}

interface StoredDraft {
  meta: BuildMeta;
  blocks: ContentBlock[];
  images: StoredImage[];
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(): Promise<boolean> {
  try {
    const db = await openDb();
    const draft: StoredDraft = {
      meta: snapshot(build.meta),
      blocks: snapshot(build.blocks) as ContentBlock[],
      // Snapshot before storing. These records live inside $state, so their
      // nested objects are reactive proxies, and IndexedDB's structured clone
      // refuses a proxy outright. Storing them raw fails every save.
      images: build.images.map((image) =>
        snapshot({
          id: image.id,
          baseName: image.baseName,
          width: image.width,
          height: image.height,
          files: image.files
        })
      ),
      savedAt: Date.now()
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(draft, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (error) {
    // Storage denied, full, or the payload refused the structured clone. The app
    // keeps working; the person just loses the safety net. Surfaced on the
    // console because a silently broken autosave is worse than a noisy one, and
    // this exact failure already shipped once.
    console.warn('buildsheet: could not save your work in progress.', error);
    lastSaveError = error instanceof Error ? error.message : String(error);
    return false;
  }
}

/** Last save failure, exposed so the interface and the tests can see it. */
export let lastSaveError: string | null = null;

export function autosaveError(): string | null {
  return lastSaveError;
}

export async function loadDraft(): Promise<{ savedAt: number; name: string } | null> {
  try {
    const db = await openDb();
    const draft = await new Promise<StoredDraft | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as StoredDraft | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!draft) return null;
    return { savedAt: draft.savedAt, name: draft.meta.name };
  } catch {
    return null;
  }
}

export async function restoreDraft(): Promise<boolean> {
  try {
    const db = await openDb();
    const draft = await new Promise<StoredDraft | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as StoredDraft | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!draft) return false;

    const images: ProcessedImage[] = draft.images.map((stored) => ({
      ...stored,
      previewUrl: URL.createObjectURL(
        new Blob([asBlobPart(stored.files.thumb.bytes)], { type: 'image/jpeg' })
      )
    }));
    build.load(draft.meta, draft.blocks, images);
    return true;
  } catch {
    return false;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Nothing to do. A draft that cannot be cleared is not worth an error message.
  }
}

/**
 * Save shortly after changes stop. The delay keeps a burst of keystrokes from
 * writing tens of megabytes of image bytes over and over.
 */
export function startAutosave(delayMs = 1500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastRevision = -1;

  const interval = setInterval(() => {
    if (build.revision === lastRevision) return;
    lastRevision = build.revision;
    clearTimeout(timer);
    timer = setTimeout(() => void saveDraft(), delayMs);
  }, 500);

  return () => {
    clearInterval(interval);
    clearTimeout(timer);
  };
}
