<!--
  @component ImageBlockRenderer
  Read-only display for image blocks.
-->
<script lang="ts">
  import type { ImageBlock, ModalImage } from '$lib/features/blocks/types';
  import type { BuildImage } from '$lib/features/builds/types';
  import { API_BASE_URL } from '$lib/config';

  interface Props {
    block: ImageBlock;
    /** Gallery images to look up the image URL */
    galleryImages?: BuildImage[];
    /** Callback when image is clicked (for lightbox) */
    onImageClick?: (images: ModalImage[], index: number) => void;
  }

  let { block, galleryImages = [], onImageClick }: Props = $props();

  /** Get the image from gallery by ID */
  const image = $derived(
    block.imageId > 0 ? galleryImages.find((img) => img.id === block.imageId) : null
  );

  /** True when the image carries real intrinsic dimensions (both > 0). Legacy
   *  rows (pre-backfill) or capture failures leave these 0/undefined, in which
   *  case we fall back to the 4/3 stopgap box. */
  const hasDimensions = $derived(!!image && (image.width ?? 0) > 0 && (image.height ?? 0) > 0);

  /** Get full image URL */
  function getImageUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  }

  function handleClick() {
    if (image && onImageClick) {
      onImageClick(
        [{ url: getImageUrl(image.url), description: block.caption || image.description }],
        0
      );
    }
  }
</script>

<div class="space-y-2">
  {#if image}
    <!-- !block overrides DaisyUI's `.card figure { display: flex }` so the
         figcaption stacks below the image instead of beside it. -->
    <figure class="!block">
      <button
        type="button"
        class="block w-full cursor-pointer"
        onclick={handleClick}
        aria-label="View full image"
      >
        <!-- Single image block renders large (up to 32rem) so it uses the full
             display image, not the thumbnail. The modal also opens the display
             image.

             When the API exposes real intrinsic width/height (captured at
             upload / backfilled), reserve exact layout space with the true
             aspect-ratio and stamp width/height on the <img> so the browser
             knows the box before the bytes arrive — no CLS. Legacy rows
             (pre-backfill) or capture failures leave dimensions 0, so we fall
             back to the 4/3 stopgap box (capped at 32rem). Either way the image
             stays object-contain so arbitrary-aspect images aren't cropped. -->
        <div
          class="w-full {hasDimensions ? '' : 'aspect-[4/3]'} max-h-[32rem] overflow-hidden rounded"
          style={hasDimensions
            ? `aspect-ratio: ${image.width}/${image.height}; background: var(--background-muted);`
            : 'background: var(--background-muted);'}
        >
          <img
            src={getImageUrl(image.url)}
            alt={block.caption || 'Build image'}
            class="w-full h-full object-contain object-center"
            width={hasDimensions ? image.width : undefined}
            height={hasDimensions ? image.height : undefined}
            loading="lazy"
            decoding="async"
          />
        </div>
      </button>
      {#if block.caption}
        <figcaption class="text-center text-sm mt-2" style="color: var(--text-muted);">
          {block.caption}
        </figcaption>
      {/if}
    </figure>
  {:else}
    <div
      class="p-8 rounded text-center"
      style="background: var(--background-muted); border: 1px dashed var(--border);"
    >
      <span style="color: var(--text-muted);">Image not available</span>
    </div>
  {/if}
</div>
