/**
 * Labels for buildsheet's own interface.
 *
 * The ported schema module has BLOCK_TYPE_LABELS, which is kept byte-identical
 * to seethespecs so the two stay easy to diff. Some of those labels assume you
 * already know the product: "List" for a spec list reads as nothing in
 * particular to a first-time user. These are the words buildsheet shows instead.
 */
import type { BlockType } from './features/blocks/types';

export const LABELS: Record<BlockType, string> = {
  section: 'Text',
  'spec-list': 'Spec list',
  'bullet-list': 'Bullet list',
  image: 'Photo',
  gallery: 'Gallery',
  video: 'Video',
  timeline: 'Timeline',
  callout: 'Callout'
};

export const HINTS: Record<BlockType, string> = {
  section: 'Words, with an optional heading',
  'spec-list': 'Part and detail rows, with optional prices',
  'bullet-list': 'A list, with optional sub items',
  image: 'One photo with a caption',
  gallery: 'A grid of photos',
  video: 'A YouTube or Vimeo link',
  timeline: 'Dated entries, in order',
  callout: 'A note, tip or warning'
};

/** The order people tend to build a page in: story, then specs, then photos. */
export const ADD_ORDER: BlockType[] = [
  'section',
  'spec-list',
  'bullet-list',
  'gallery',
  'image',
  'timeline',
  'video',
  'callout'
];
