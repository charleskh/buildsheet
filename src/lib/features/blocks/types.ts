/**
 * @fileoverview Type definitions for the block-based content editor.
 *
 * Content is stored as a JSON array of typed block objects. Each block
 * has a discriminated `type` field to identify its schema.
 *
 * Image blocks reference BuildImage records by ID, creating a 1:1
 * relationship between blocks and gallery images when created via the editor.
 */

import { safeHref } from '$lib/utils/safeHref';

// ============================================================================
// Block Type Identifiers
// ============================================================================

/** All supported block types */
export type BlockType =
  | 'section'
  | 'spec-list'
  | 'bullet-list'
  | 'image'
  | 'gallery'
  | 'video'
  | 'timeline'
  | 'callout';

// ============================================================================
// Shared Types
// ============================================================================

/** Optional link for list items or values */
export interface ItemLink {
  url: string;
  /**
   * SEO/accessibility label for the link (used in aria-label/title).
   * Does NOT change the displayed text — the item's value is always shown.
   */
  label?: string;
}

// ============================================================================
// Section Block
// ============================================================================

/**
 * A section with header and body text.
 * Use for narrative content, descriptions, and explanations.
 */
export interface SectionBlock {
  type: 'section';
  id: string;
  header: string;
  /** Plain text body, may contain basic links */
  body: string;
}

// ============================================================================
// Spec List Block
// ============================================================================

/** A single key-value specification entry */
export interface SpecItem {
  key: string;
  value: string;
  /**
   * Optional buy/reference link for the item (e.g., where to source the part).
   * Wraps the displayed value when set.
   */
  link?: ItemLink;
  /**
   * Optional free-text price for parts/cost lists (e.g., "$1,200", "£89.99",
   * or "call for price"). Stored verbatim and displayed as-is; only the
   * numeric-parseable entries contribute to a spec-list's running total
   * (see {@link specListTotal}).
   */
  price?: string;
}

/**
 * A specification list with key-value pairs.
 * Use for technical specs, part lists, measurements.
 */
export interface SpecListBlock {
  type: 'spec-list';
  id: string;
  header: string;
  items: SpecItem[];
}

// ============================================================================
// Bullet List Block
// ============================================================================

/** A single bullet list item with optional sub-items */
export interface BulletItem {
  text: string;
  link?: ItemLink;
  subItems?: BulletSubItem[];
}

/** A nested sub-item within a bullet item */
export interface BulletSubItem {
  text: string;
  link?: ItemLink;
}

/**
 * A bulleted list with optional nested sub-items.
 * Use for feature lists, checklists, component lists.
 */
export interface BulletListBlock {
  type: 'bullet-list';
  id: string;
  header: string;
  items: BulletItem[];
}

// ============================================================================
// Image Block
// ============================================================================

/**
 * An image block referencing a BuildImage by ID.
 *
 * When created via the editor, uploading an image creates a BuildImage
 * record and stores its ID here. Deleting this block also deletes the
 * associated BuildImage.
 *
 * Source indicates how the image was added:
 * - 'block': Created via the content editor (block owns the image)
 * - 'gallery': Referenced from existing gallery (block does not own image)
 */
export interface ImageBlock {
  type: 'image';
  id: string;
  /** BuildImage.id reference */
  imageId: number;
  /** Optional caption displayed below the image */
  caption?: string;
  /** How the image was added to this block */
  source: 'block' | 'gallery';
}

// ============================================================================
// Gallery Block
// ============================================================================

/**
 * A gallery block referencing multiple BuildImages by ID.
 *
 * Gallery-block images are *always* block-owned: uploading via the gallery
 * editor creates BuildImage records, and removing them (or deleting the block)
 * deletes those records. There is no "reference from Photos pool" mode for
 * galleries — keep that pattern on the single `image` block only.
 */
export interface GalleryBlock {
  type: 'gallery';
  id: string;
  /** Section heading shown above the grid (e.g., "Engine", "Interior") */
  header: string;
  /** Array of BuildImage.id references; order is preserved for display */
  imageIds: number[];
  /**
   * BuildImage.id of the image shown on the collapsed "cover card". Optional —
   * when unset (or pointing at an id no longer in `imageIds`), the renderer
   * falls back to the first image in `imageIds`. Persists inside the block
   * content JSON via the normal content save (no DB column / migration).
   */
  coverImageId?: number;
}

// ============================================================================
// Video Block
// ============================================================================

/**
 * A video embed block holding a single YouTube or Vimeo URL.
 *
 * Only the pasted `url` is stored; the embed/watch URLs are derived at render
 * time by `parseVideoUrl` (see `./video.ts`). Videos are *embedded, never
 * uploaded* — there is no BuildImage or storage blob behind this block, so it is
 * invisible to image-orphan cleanup. Keep it that way to avoid egress cost.
 */
export interface VideoBlock {
  type: 'video';
  id: string;
  /** The pasted YouTube/Vimeo URL (watch, youtu.be, embed, shorts, or vimeo). */
  url: string;
  /** Optional heading shown above the video. */
  header?: string;
  /** Optional caption displayed below the video. */
  caption?: string;
}

// ============================================================================
// Timeline Block
// ============================================================================

/** A single timeline entry */
export interface TimelineEntry {
  date: string;
  title: string;
  description?: string;
}

/**
 * A timeline showing build progress over time.
 * Use for documenting build phases, milestones, updates.
 */
export interface TimelineBlock {
  type: 'timeline';
  id: string;
  header: string;
  entries: TimelineEntry[];
}

// ============================================================================
// Callout Block
// ============================================================================

/** Callout types for different emphasis levels */
export type CalloutType = 'note' | 'warning' | 'tip';

/**
 * A callout box for highlighted information.
 * Use for tips, warnings, important notes.
 */
export interface CalloutBlock {
  type: 'callout';
  id: string;
  calloutType: CalloutType;
  body: string;
}

// ============================================================================
// Union Type
// ============================================================================

/** Discriminated union of all content block types */
export type ContentBlock =
  | SectionBlock
  | SpecListBlock
  | BulletListBlock
  | ImageBlock
  | GalleryBlock
  | VideoBlock
  | TimelineBlock
  | CalloutBlock;

// ============================================================================
// Content Container
// ============================================================================

/**
 * The full content model stored in Build.content as JSON.
 *
 * Version field allows future schema migrations.
 */
export interface BlockContent {
  version: 1;
  blocks: ContentBlock[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * A single image as the ImageModal expects it.
 * Block renderers build a list of these and pass them up via onImageClick so
 * the modal can be scoped to a single block (a click in a gallery navigates
 * that gallery only; a click on a single image opens a 1-image modal).
 */
export interface ModalImage {
  url: string;
  description?: string;
}

/** Generate a unique block ID */
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create an empty block of the given type */
export function createEmptyBlock(type: BlockType): ContentBlock {
  const id = generateBlockId();

  switch (type) {
    case 'section':
      return { type: 'section', id, header: '', body: '' };
    case 'spec-list':
      return { type: 'spec-list', id, header: '', items: [] };
    case 'bullet-list':
      return { type: 'bullet-list', id, header: '', items: [] };
    case 'image':
      return { type: 'image', id, imageId: 0, caption: '', source: 'block' };
    case 'gallery':
      return { type: 'gallery', id, header: '', imageIds: [] };
    case 'video':
      return { type: 'video', id, url: '', header: '', caption: '' };
    case 'timeline':
      return { type: 'timeline', id, header: '', entries: [] };
    case 'callout':
      return { type: 'callout', id, calloutType: 'note', body: '' };
  }
}

/** The set of known block types, used to validate untrusted `type` fields. */
const KNOWN_BLOCK_TYPES = new Set<BlockType>([
  'section',
  'spec-list',
  'bullet-list',
  'image',
  'gallery',
  'video',
  'timeline',
  'callout'
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Strip an item's `link` when its URL fails the {@link safeHref} scheme
 * allowlist (javascript:/data:/vbscript:/etc). Mutates the item in place so the
 * dangerous link never reaches a renderer; the item itself (key/value/text) is
 * preserved. A safe URL is left untouched.
 */
function sanitizeItemLink(item: unknown): void {
  if (!isRecord(item)) return;
  const link = item.link;
  if (!isRecord(link)) return;
  const url = link.url;
  if (!isString(url) || safeHref(url) === undefined) {
    delete item.link;
  }
}

/**
 * Validate a single untrusted value against the {@link ContentBlock} discriminated
 * union. Returns the value typed as a ContentBlock when it has a known `type`, a
 * string `id`, and all required per-type fields of the correct shape; otherwise
 * returns null so the caller can drop it. This is intentionally strict on the
 * fields the renderers read and lenient about extra/optional fields (forward
 * compatibility) — the public renderer must never receive a malformed block.
 */
function validateBlock(value: unknown): ContentBlock | null {
  if (!isRecord(value)) return null;
  if (!isString(value.id)) return null;
  if (!isString(value.type) || !KNOWN_BLOCK_TYPES.has(value.type as BlockType)) return null;

  switch (value.type as BlockType) {
    case 'section':
      if (!isString(value.header) || !isString(value.body)) return null;
      return value as unknown as SectionBlock;
    case 'spec-list':
      if (!isString(value.header) || !Array.isArray(value.items)) return null;
      // Drop any item link whose URL fails the scheme allowlist (stored XSS).
      for (const item of value.items) sanitizeItemLink(item);
      return value as unknown as SpecListBlock;
    case 'bullet-list':
      if (!isString(value.header) || !Array.isArray(value.items)) return null;
      // Drop unsafe links on items and their sub-items (stored XSS).
      for (const item of value.items) {
        sanitizeItemLink(item);
        if (isRecord(item) && Array.isArray(item.subItems)) {
          for (const subItem of item.subItems) sanitizeItemLink(subItem);
        }
      }
      return value as unknown as BulletListBlock;
    case 'image':
      if (typeof value.imageId !== 'number') return null;
      if (value.source !== 'block' && value.source !== 'gallery') return null;
      return value as unknown as ImageBlock;
    case 'gallery':
      if (!isString(value.header) || !Array.isArray(value.imageIds)) return null;
      if (!value.imageIds.every((id) => typeof id === 'number')) return null;
      return value as unknown as GalleryBlock;
    case 'video':
      if (!isString(value.url)) return null;
      return value as unknown as VideoBlock;
    case 'timeline':
      if (!isString(value.header) || !Array.isArray(value.entries)) return null;
      return value as unknown as TimelineBlock;
    case 'callout':
      if (!isString(value.body)) return null;
      if (
        value.calloutType !== 'note' &&
        value.calloutType !== 'warning' &&
        value.calloutType !== 'tip'
      ) {
        return null;
      }
      return value as unknown as CalloutBlock;
    default:
      return null;
  }
}

/**
 * Parse content string into BlockContent.
 *
 * Defensively validates untrusted JSON: the content is the renderer/editor
 * contract, so malformed or old-schema blocks must never flow through cast as
 * valid. Each block is validated against the {@link ContentBlock} discriminated
 * union and silently dropped if it doesn't match — the public renderer never
 * crashes on bad data and never throws here. Falls back to a single section
 * block for legacy plain-text (non-JSON) content.
 */
export function parseBlockContent(content: string): BlockContent {
  if (!content || content.trim() === '') {
    return { version: 1, blocks: [] };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    // Validate it's a BlockContent structure with the expected version + an
    // array of blocks. Anything else falls through to the legacy text path.
    if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.blocks)) {
      const blocks: ContentBlock[] = [];
      for (const candidate of parsed.blocks) {
        const block = validateBlock(candidate);
        if (block) blocks.push(block);
      }
      return { version: 1, blocks };
    }
  } catch {
    // Not JSON, treat as legacy plain-text content
  }

  // Convert legacy plain-text to a single section block
  return {
    version: 1,
    blocks: [
      {
        type: 'section',
        id: generateBlockId(),
        header: 'Build Details',
        body: content
      }
    ]
  };
}

/** Serialize BlockContent to JSON string for storage */
export function serializeBlockContent(content: BlockContent): string {
  return JSON.stringify(content);
}

/**
 * Extract all image IDs referenced by blocks.
 * Walks both single `image` blocks and `gallery` blocks. Useful for determining
 * which BuildImages are owned by blocks (and would orphan if the blocks are removed).
 */
export function extractImageIds(blocks: ContentBlock[]): number[] {
  const ids: number[] = [];
  for (const block of blocks) {
    if (block.type === 'image' && block.imageId > 0) {
      ids.push(block.imageId);
    } else if (block.type === 'gallery') {
      for (const id of block.imageIds) {
        if (id > 0) ids.push(id);
      }
    }
  }
  return ids;
}

/**
 * Parse a free-text price string into a number, or null if it has no numeric
 * value. US-style formatting is assumed: commas are treated as thousands
 * separators and stripped, the first number-like token is used. Examples:
 * "$1,200" → 1200, "£89.99" → 89.99, "call for price" → null.
 */
export function parseSpecPrice(price: string | undefined | null): number | null {
  if (!price) return null;
  const match = price.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Detect a leading currency symbol/prefix in a price string (anything before
 * the first digit that isn't whitespace, a digit, or a separator). Returns ''
 * when none is present (e.g. a bare "1200").
 */
function detectCurrencySymbol(price: string): string {
  const match = price.match(/^\s*([^\d\s.,]+)/);
  return match ? match[1] : '';
}

/**
 * Sum the numeric-parseable prices across a spec list's items for a cost/BOM
 * total. Returns null when no item carries a parseable price (so plain
 * technical-spec lists never render a total). The currency symbol is taken
 * from the first priced item that has one.
 */
export function specListTotal(items: SpecItem[]): { sum: number; symbol: string } | null {
  let sum = 0;
  let symbol = '';
  let found = false;
  for (const item of items) {
    const n = parseSpecPrice(item.price);
    if (n === null) continue;
    found = true;
    sum += n;
    if (!symbol && item.price) symbol = detectCurrencySymbol(item.price);
  }
  return found ? { sum, symbol } : null;
}

/** Format a numeric total for display (US grouping, up to 2 decimals). */
export function formatSpecTotal(sum: number): string {
  return sum.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Human-readable block type labels */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  section: 'Section',
  'spec-list': 'List',
  'bullet-list': 'Bullet List',
  image: 'Image',
  gallery: 'Gallery',
  video: 'Video',
  timeline: 'Timeline',
  callout: 'Callout'
};

/** Block type descriptions for the add menu */
export const BLOCK_TYPE_DESCRIPTIONS: Record<BlockType, string> = {
  section: 'Header with body text',
  'spec-list': 'Key-value list items',
  'bullet-list': 'Bulleted list with optional sub-items',
  image: 'Single image with caption',
  gallery: 'Grid of multiple images under a heading',
  video: 'Embedded YouTube or Vimeo video',
  timeline: 'Dated progress entries',
  callout: 'Note, warning, or tip box'
};
