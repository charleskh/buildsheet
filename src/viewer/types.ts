/**
 * The payload a generated site carries.
 *
 * This is what gets written to content/build.json and inlined into the page, and
 * it is what the maker reads back when someone reloads a site to keep editing.
 * `content` uses the seethespecs block schema at version 1, unchanged, so a
 * build moves between the two without translation.
 */
import type { BlockContent } from '$lib/features/blocks/types';
import type { BuildImage } from '$lib/features/builds/types';
import type { BuildLink } from '$lib/state/build.svelte';

export interface SiteData {
  /** Format version of this wrapper, not of the block content. */
  buildsheet: 1;
  name: string;
  description: string;
  startDate: string;
  author: string;
  /** Canonical address of this site, when its owner supplied one. */
  siteUrl?: string;
  /** Where to find the owner, shown in the page header. */
  links: BuildLink[];
  coverImage: { url: string; mid: string; thumb: string } | null;
  content: BlockContent;
  images: BuildImage[];
  generatedAt: string;
}
