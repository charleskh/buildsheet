/**
 * The whole application state.
 *
 * One build at a time, held in memory, mirrored to IndexedDB so a closed tab
 * does not cost an afternoon. There is no server and no account, so this module
 * is the only source of truth while the app is open.
 */

import type { ContentBlock, BlockContent, BlockType } from '$lib/features/blocks/types';
import { createEmptyBlock } from '$lib/features/blocks/types';
import type { BuildImage } from '$lib/features/builds/types';
import type { ProcessedImage, TierName } from '$lib/images/pipeline';

export interface BuildMeta {
  name: string;
  /** ISO date, or empty when the person has not said. */
  startDate: string;
  description: string;
  category: string;
  tags: string[];
  /** Image id used as the page hero. */
  coverImageId: number | null;
  /** Shown as the byline on the generated page. */
  author: string;
}

export function emptyMeta(): BuildMeta {
  return {
    name: '',
    startDate: '',
    description: '',
    category: '',
    tags: [],
    coverImageId: null,
    author: ''
  };
}

/** Where image URLs should point when rendering. */
export type UrlMode = 'preview' | 'export';

class BuildStore {
  meta = $state<BuildMeta>(emptyMeta());
  blocks = $state<ContentBlock[]>([]);
  images = $state<ProcessedImage[]>([]);
  /** Bumped every time anything changes, so persistence can debounce on it. */
  revision = $state(0);

  private nextImageId = 1;

  touch(): void {
    this.revision++;
  }

  // ---------------------------------------------------------------- blocks

  addBlock(type: BlockType, index?: number): ContentBlock {
    const block = createEmptyBlock(type);
    if (index === undefined || index >= this.blocks.length) this.blocks.push(block);
    else this.blocks.splice(Math.max(0, index), 0, block);
    this.touch();
    return block;
  }

  removeBlock(id: string): void {
    const block = this.blocks.find((b) => b.id === id);
    if (!block) return;

    // Removing an image or gallery block drops the images it owns, mirroring
    // seethespecs. Nothing else can reference them, so they would be dead weight
    // in the exported zip.
    const owned: number[] = [];
    if (block.type === 'image' && block.source === 'block') owned.push(block.imageId);
    if (block.type === 'gallery') owned.push(...block.imageIds);

    this.blocks = this.blocks.filter((b) => b.id !== id);
    for (const imageId of owned) this.removeImage(imageId);
    this.touch();
  }

  moveBlock(id: string, direction: -1 | 1): void {
    const from = this.blocks.findIndex((b) => b.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= this.blocks.length) return;
    const [moved] = this.blocks.splice(from, 1);
    this.blocks.splice(to, 0, moved);
    this.touch();
  }

  replaceBlock(updated: ContentBlock): void {
    const i = this.blocks.findIndex((b) => b.id === updated.id);
    if (i >= 0) this.blocks[i] = updated;
    this.touch();
  }

  // ---------------------------------------------------------------- images

  claimImageIds(count: number): number {
    const start = this.nextImageId;
    this.nextImageId += count;
    return start;
  }

  addImages(processed: ProcessedImage[]): void {
    this.images.push(...processed);
    if (this.meta.coverImageId === null && processed.length > 0) {
      this.meta.coverImageId = processed[0].id;
    }
    this.touch();
  }

  removeImage(id: number): void {
    const image = this.images.find((i) => i.id === id);
    if (image) URL.revokeObjectURL(image.previewUrl);
    this.images = this.images.filter((i) => i.id !== id);
    if (this.meta.coverImageId === id) this.meta.coverImageId = this.images[0]?.id ?? null;
    this.touch();
  }

  image(id: number): ProcessedImage | undefined {
    return this.images.find((i) => i.id === id);
  }

  /** Highest id ever handed out, so a reloaded build does not reuse one. */
  syncNextId(): void {
    this.nextImageId = Math.max(0, ...this.images.map((i) => i.id)) + 1;
  }

  // ------------------------------------------------------------- rendering

  /**
   * Adapt local images into the shape the ported seethespecs renderers expect.
   *
   * In preview mode the URLs are object URLs pointing at bytes in memory. In
   * export mode they are relative paths inside the generated site. The renderers
   * never know the difference, which is why they needed almost no changes.
   */
  buildImages(mode: UrlMode): BuildImage[] {
    return this.images.map((image) => {
      const at = (tier: TierName) =>
        mode === 'preview' ? image.previewUrl : image.files[tier].path;
      return {
        id: image.id,
        url: mode === 'preview' ? image.previewUrl : image.files.full.path,
        thumb_url: at('thumb'),
        thumb2x_url: at('mid'),
        width: image.files.full.width,
        height: image.files.full.height,
        description: ''
      };
    });
  }

  content(): BlockContent {
    return { version: 1, blocks: this.blocks };
  }

  /** Replace everything, used by the importer and by reloading a saved zip. */
  load(meta: BuildMeta, blocks: ContentBlock[], images: ProcessedImage[]): void {
    for (const image of this.images) URL.revokeObjectURL(image.previewUrl);
    this.meta = meta;
    this.blocks = blocks;
    this.images = images;
    this.syncNextId();
    this.touch();
  }

  reset(): void {
    this.load(emptyMeta(), [], []);
  }

  get isEmpty(): boolean {
    return !this.meta.name && this.blocks.length === 0 && this.images.length === 0;
  }
}

export const build = new BuildStore();

/**
 * Detach a reactive proxy into plain data.
 *
 * `$state.snapshot` is a compiler rune, so it only exists inside .svelte and
 * .svelte.ts modules. Plain modules that need to serialize state (the exporter,
 * the autosave) call this instead of reaching for the rune and silently getting
 * a runtime "not defined" error.
 */
export function snapshot<T>(value: T): T {
  return $state.snapshot(value) as T;
}

/** Slug used for the zip filename and the site directory. */
export function buildSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'my-build';
}
