<!--
  @component BlockContentRenderer
  Renders an array of content blocks in read-only mode.

  Use this on build detail pages, QR views, and print layouts.

  Image clicks bubble up the *clicked block's own image list* so the parent
  can scope its modal to that block (a click in a gallery block navigates only
  that gallery; a click on a single image opens a 1-image modal).

  @example
  ```svelte
  <BlockContentRenderer
    content={build.content}
    galleryImages={images}
    onImageClick={(images, index) => openLightbox(images, index)}
  />
  ```
-->
<script lang="ts">
  import type { BlockContent, ContentBlock, ModalImage } from '$lib/features/blocks/types';
  import { parseBlockContent } from '$lib/features/blocks/types';
  import type { BuildImage } from '$lib/features/builds/types';

  import SectionBlockRenderer from './SectionBlockRenderer.svelte';
  import SpecListBlockRenderer from './SpecListBlockRenderer.svelte';
  import BulletListBlockRenderer from './BulletListBlockRenderer.svelte';
  import ImageBlockRenderer from './ImageBlockRenderer.svelte';
  import GalleryBlockRenderer from './GalleryBlockRenderer.svelte';
  import VideoBlockRenderer from './VideoBlockRenderer.svelte';
  import TimelineBlockRenderer from './TimelineBlockRenderer.svelte';
  import CalloutBlockRenderer from './CalloutBlockRenderer.svelte';

  interface Props {
    /** JSON string content from Build.content or BlockContent object */
    content: string | BlockContent;
    /** Gallery images for resolving image block references */
    galleryImages?: BuildImage[];
    /**
     * Called when a user clicks an image inside a block. `images` is the
     * clicked block's own list; `index` is where in that list to start.
     */
    onImageClick?: (images: ModalImage[], index: number) => void;
  }

  let { content, galleryImages = [], onImageClick }: Props = $props();

  /** Parse content into BlockContent if it's a string */
  const parsedContent = $derived(
    typeof content === 'string' ? parseBlockContent(content) : content
  );

  /** Check if there are any non-empty blocks */
  const hasContent = $derived(
    parsedContent.blocks.length > 0 && parsedContent.blocks.some((block) => !isBlockEmpty(block))
  );

  /**
   * id of the FIRST non-empty gallery block on the page. That gallery renders
   * expanded by default (tile grid visible); every other gallery starts as a
   * collapsed cover card so a build with several galleries stays scannable.
   * Keyed by block id (stable across the same array) rather than index so it
   * survives the `isBlockEmpty` skip in the loop below.
   */
  const firstGalleryId = $derived(
    parsedContent.blocks.find((block) => block.type === 'gallery' && !isBlockEmpty(block))?.id
  );

  /**
   * id of the FIRST non-empty timeline block on the page. That timeline renders
   * expanded by default; every other timeline starts collapsed so a build with
   * several timelines stays scannable. Mirrors `firstGalleryId`.
   */
  const firstTimelineId = $derived(
    parsedContent.blocks.find((block) => block.type === 'timeline' && !isBlockEmpty(block))?.id
  );

  /** Check if a block is empty (has no meaningful content) */
  function isBlockEmpty(block: ContentBlock): boolean {
    switch (block.type) {
      case 'section':
        return !block.header && !block.body;
      case 'spec-list':
        return !block.header && block.items.length === 0;
      case 'bullet-list':
        return !block.header && block.items.length === 0;
      case 'image':
        return block.imageId <= 0;
      case 'gallery':
        return !block.header && block.imageIds.length === 0;
      case 'video':
        return !block.url;
      case 'timeline':
        return !block.header && block.entries.length === 0;
      case 'callout':
        return !block.body;
      default:
        return true;
    }
  }
</script>

{#if hasContent}
  <div class="space-y-6">
    {#each parsedContent.blocks as block (block.id)}
      {#if !isBlockEmpty(block)}
        <!-- data-block-id is a scroll target for the table of contents.
             scroll-mt-* gives the anchor enough breathing room so scrolled-to
             headings don't end up flush against the top of the viewport. -->
        <div data-block-id={block.id} class="scroll-mt-24">
          {#if block.type === 'section'}
            <SectionBlockRenderer {block} />
          {:else if block.type === 'spec-list'}
            <SpecListBlockRenderer {block} />
          {:else if block.type === 'bullet-list'}
            <BulletListBlockRenderer {block} />
          {:else if block.type === 'image'}
            <ImageBlockRenderer {block} {galleryImages} {onImageClick} />
          {:else if block.type === 'gallery'}
            <GalleryBlockRenderer
              {block}
              {galleryImages}
              {onImageClick}
              isFirstGallery={block.id === firstGalleryId}
            />
          {:else if block.type === 'video'}
            <VideoBlockRenderer {block} />
          {:else if block.type === 'timeline'}
            <TimelineBlockRenderer {block} isFirstTimeline={block.id === firstTimelineId} />
          {:else if block.type === 'callout'}
            <CalloutBlockRenderer {block} />
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
