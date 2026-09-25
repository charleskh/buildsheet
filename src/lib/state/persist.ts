/**
 * Saved builds.
 *
 * Someone spends an hour captioning photos and then closes the tab. Without
 * this, that hour is gone, and there is no server to have saved it for them.
 * IndexedDB is used rather than localStorage because the image bytes run to
 * tens of megabytes, far past what localStorage will hold.
 *
 * More than one build is kept, keyed by id, so coming back to the maker shows
 * everything you have made on this machine rather than only the last one.
 *
 * Every access is wrapped, because storage can be unavailable or denied in a
 * private window and the app has to keep working when it is.
 */

import type { ContentBlock } from '$lib/features/blocks/types';
import type { ProcessedImage, TierName, CropRect } from '$lib/images/pipeline';
import { asBlobPart } from '$lib/bytes';
import { build, snapshot, type BuildMeta } from './build.svelte';

const DB_NAME = 'buildsheet';
const DB_VERSION = 2;
const STORE = 'drafts';
/** Where the pre-multi-build format kept its single draft. */
const LEGACY_KEY = 'current';

interface StoredImage {
  id: number;
  baseName: string;
  width: number;
  height: number;
  files: Record<TierName, { path: string; bytes: Uint8Array; width: number; height: number }>;
  crop?: CropRect;
  sourceBytes?: Uint8Array;
}

interface StoredDraft {
  /** Stable id for this build, used as the record key. */
  id: string;
  meta: BuildMeta;
  blocks: ContentBlock[];
  images: StoredImage[];
  savedAt: number;
}

export interface DraftSummary {
  id: string;
  name: string;
  savedAt: number;
  photoCount: number;
  blockCount: number;
}

export let lastSaveError: string | null = null;

function newId(): string {
  return `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

/** Which build the open editor is working on. Set when one is created or opened. */
let currentId: string | null = null;

export function setCurrentId(id: string | null): void {
  currentId = id;
}

export function getCurrentId(): string | null {
  return currentId;
}

export async function saveDraft(): Promise<boolean> {
  try {
    if (!currentId) currentId = newId();
    const db = await openDb();
    const draft: StoredDraft = {
      id: currentId,
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
          files: image.files,
          crop: image.crop,
          sourceBytes: image.sourceBytes
        })
      ),
      savedAt: Date.now()
    };
    await tx(db, 'readwrite', (store) => store.put(draft, currentId!));
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

/** Everything saved on this machine, newest first. */
export async function listDrafts(): Promise<DraftSummary[]> {
  try {
    const db = await openDb();
    const keys = await tx<IDBValidKey[]>(db, 'readonly', (store) => store.getAllKeys());
    const records = await tx<StoredDraft[]>(db, 'readonly', (store) => store.getAll());
    db.close();

    const out: DraftSummary[] = [];
    records.forEach((draft, i) => {
      if (!draft?.meta) return;
      out.push({
        id: draft.id ?? String(keys[i]),
        name: draft.meta.name || 'Untitled build',
        savedAt: draft.savedAt ?? 0,
        photoCount: draft.images?.length ?? 0,
        blockCount: draft.blocks?.length ?? 0
      });
    });
    return out.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function toProcessed(stored: StoredImage[]): ProcessedImage[] {
  return stored.map((image) => ({
    ...image,
    previewUrl: URL.createObjectURL(
      new Blob([asBlobPart(image.files.thumb.bytes)], { type: 'image/jpeg' })
    )
  }));
}

export async function openDraft(id: string): Promise<boolean> {
  try {
    const db = await openDb();
    const draft = await tx<StoredDraft | undefined>(db, 'readonly', (store) => store.get(id));
    db.close();
    if (!draft) return false;
    build.load(draft.meta, draft.blocks, toProcessed(draft.images ?? []));
    currentId = draft.id ?? id;
    return true;
  } catch {
    return false;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (store) => store.delete(id));
    db.close();
    if (currentId === id) currentId = null;
  } catch {
    // A draft that will not delete is not worth an error message.
  }
}

/**
 * Move a single-draft record from the previous format into the keyed one.
 *
 * Someone who used the maker before this change has work under the old key and
 * would otherwise open the app to an empty list.
 */
export async function migrateLegacyDraft(): Promise<void> {
  try {
    const db = await openDb();
    const legacy = await tx<StoredDraft | undefined>(db, 'readonly', (store) => store.get(LEGACY_KEY));
    if (legacy?.meta) {
      const id = newId();
      await tx(db, 'readwrite', (store) => store.put({ ...legacy, id }, id));
      await tx(db, 'readwrite', (store) => store.delete(LEGACY_KEY));
    }
    db.close();
  } catch {
    // Nothing recoverable. The app opens with whatever else is there.
  }
}

/** Start a new build, so the next save does not overwrite the one just closed. */
export function startNewDraft(): void {
  currentId = newId();
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
