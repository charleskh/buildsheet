<!--
  @component GalleryBlockRenderer
  Read-only grid display for gallery blocks: an optional header above a
  responsive grid of images. Clicking an image bubbles up via `onImageClick`
  (the parent typically opens its existing `ImageModal`).

  Each gallery is wrapped in a native <details>/<summary> disclosure so a build
  page with several galleries stays scannable (stacked tile grids made a very
  long, hard-to-skim page, especially on mobile). The <summary> is a "cover
  card" — cover thumbnail + header + photo count + chevron — and the unchanged
  tile grid lives in the expanded body. Native <details> gives us keyboard +
  screen-reader support for free. The first gallery on a page opens by default
  (`isFirstGallery`); the rest start collapsed.
-->
<script lang="ts">
  import type { GalleryBlock, ModalImage } from '$lib/features/blocks/types';
  import type { BuildImage } from '$lib/features/builds/types';
  import { API_BASE_URL } from '$lib/config';
  import CaptionPopover from '$lib/components/ui/CaptionPopover.svelte';

  interface Props {
    block: GalleryBlock;
    /** Pool of build images used to resolve `block.imageIds` */
    galleryImages?: BuildImage[];
    /** Callback when an image is clicked (for lightbox/modal) */
    onImageClick?: (images: ModalImage[], index: number) => void;
    /**
     * True only for the FIRST gallery block on the page — controls the initial
     * open/closed state of the disclosure. The first gallery renders expanded
     * (tile grid visible); subsequent galleries start collapsed (cover card).
     * Initial state only; the user can toggle any gallery freely afterwards.
     */
    isFirstGallery?: boolean;
  }

  let { block, galleryImages = [], onImageClick, isFirstGallery = false }: Props = $props();

  // Bound to the <details> element so the bottom "Collapse" button can close it.
  let detailsEl: HTMLDetailsElement | undefined = $state();

  /** Close the disclosure, then scroll its summary/top back into view so the
   *  user lands at the now-collapsed header instead of being stranded mid-page. */
  function collapse() {
    if (!detailsEl) return;
    detailsEl.open = false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detailsEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  // Track which images have finished loading so each tile shows a pulsing
  // skeleton placeholder until its image is ready (avoids blank/janky pop-in).
  // Keyed by image id; an entry becomes true on the <img> load/error event.
  let loaded = $state<Record<number, boolean>>({});

  function markLoaded(id: number) {
    loaded[id] = true;
  }

  /**
   * Resolved images in the order specified by `block.imageIds`. Missing IDs are
   * skipped, and duplicate IDs are collapsed to the first occurrence so the keyed
   * `{#each}` below never sees a repeated key (and the same image isn't shown twice).
   */
  const images = $derived(
    Array.from(new Set(block.imageIds))
      .map((id) => galleryImages.find((img) => img.id === id))
      .filter((img): img is BuildImage => img !== undefined)
  );

  /**
   * The image shown on the collapsed cover card: the one whose id matches
   * `block.coverImageId`, falling back to the FIRST resolved image when the
   * cover id is unset or no longer present in `imageIds` (e.g. it was removed).
   * `images` is already resolved + ordered, so the fallback is `images[0]`.
   */
  const coverImage = $derived(images.find((img) => img.id === block.coverImageId) ?? images[0]);

  function getImageUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  }

  /** Tile source: prefer the ~400px thumbnail, fall back to the display URL
   *  (legacy rows pre-backfill, or when server thumbnailing failed). */
  function tileUrl(img: BuildImage): string {
    return getImageUrl(img.thumb_url || img.url);
  }

  /** srcset of TILE-sized candidates only: the ~400px thumb (1x) and, when
   *  available, the ~800px hi-DPI tile (2x). The 2560px display `url` is
   *  deliberately NOT offered here — a tile never needs it, and including it made
   *  Retina/4K browsers download the full display original (and bypass the CDN
   *  for legacy supabase.co `url`s) just to fill a small tile. The lightbox still
   *  uses `url` via handleClick. Returns undefined when there's no distinct
   *  thumb to advertise (renderer falls back to the bare `src`). */
  function tileSrcset(img: BuildImage): string | undefined {
    if (!img.thumb_url || img.thumb_url === img.url) return undefined;
    const candidates = [`${getImageUrl(img.thumb_url)} 400w`];
    if (img.thumb2x_url) {
      candidates.push(`${getImageUrl(img.thumb2x_url)} 800w`);
    }
    return candidates.join(', ');
  }

  function handleClick(clickedIndex: number) {
    if (!onImageClick) return;
    // Modal always uses the full display image.
    const modalList: ModalImage[] = images.map((img) => ({
      url: getImageUrl(img.url),
      description: img.description
    }));
    onImageClick(modalList, clickedIndex);
  }
</script>

<section>
  {#if images.length > 0}
    <!-- Native disclosure: the <summary> is the collapsed cover card; the tile
         grid (unchanged) is the expanded body. `open` is the INITIAL state only
         (first gallery on the page) — the user can toggle afterwards. -->
    <details
      bind:this={detailsEl}
      class="gallery-disclosure group/details rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style="background: var(--surface); border: 1px solid var(--border);"
      open={isFirstGallery}
    >
      <!-- Header ROW of the shared card (no border/rounded of its own — those
           live on the <details> so collapsed + expanded read as one card). The
           chevron rotates via the [open] state on the parent <details> (CSS),
           and animation is suppressed under reduced-motion. When open, a bottom
           divider (see <style>) separates this header from the grid below. -->
      <summary
        class="gallery-cover list-none cursor-pointer flex items-center gap-3 p-2 pr-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
        style="outline-color: var(--accent-primary);"
      >
        <!-- Cover thumbnail (tile-sized; never the full display url). -->
        {#if coverImage}
          <img
            src={getImageUrl(coverImage.thumb_url || coverImage.url)}
            srcset={tileSrcset(coverImage)}
            sizes="80px"
            alt=""
            width="80"
            height="80"
            decoding="async"
            class="h-16 w-16 sm:h-20 sm:w-20 flex-none rounded object-cover object-center"
          />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="font-semibold truncate" style="color: var(--text-primary);">
            {block.header || 'Gallery'}
          </div>
          <div class="text-sm" style="color: var(--text-muted);">
            {images.length}
            {images.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>
        <!-- Chevron: points down when collapsed, up when open. Decorative — the
             expanded/collapsed state is conveyed natively by <details>/<summary>. -->
        <svg
          class="chevron h-5 w-5 flex-none"
          style="color: var(--text-muted);"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>

      <!-- Expanded body: today's tile grid, nested INSIDE the shared card. The
           title isn't repeated here — it already shows in the cover/summary row
           above. Padding (scaled down on mobile) gives the grid breathing room,
           and the summary's [open] bottom border (see <style>) divides
           header→content so they read as one element. -->
      <div class="gallery-body p-3 sm:p-4">
        <!-- flex-wrap + justify-center so an underfilled last row (e.g. 3 images on
             a 4-column layout) centers instead of left-aligning. Item widths mimic
             the old 2/3/4-column breakpoints; gap-3 = 0.75rem is folded into the
             calc so a full row still sums to 100%. -->
        <div class="flex flex-wrap gap-3 justify-center">
          {#each images as image, idx (image.id)}
            <!-- Tile is a CONTAINER, not a button: the image area (a button) opens the
             lightbox, and the corner zoom/caption icons are SIBLING buttons. This
             avoids nesting interactive elements (button-in-button), the class of
             bug that previously broke gallery drag-and-drop. -->
            <figure
              class="card shadow hover:shadow-md transition-shadow overflow-hidden group relative w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)]"
            >
              <button
                type="button"
                class="block aspect-square w-full"
                onclick={() => handleClick(idx)}
                aria-label={image.description || 'View image'}
              >
                <span class="aspect-square flex items-center justify-center relative">
                  {#if !loaded[image.id]}
                    <!-- Pulsing placeholder occupying the tile until the image loads -->
                    <span class="skeleton absolute inset-0" aria-hidden="true"></span>
                  {/if}
                  <img
                    src={tileUrl(image)}
                    srcset={tileSrcset(image)}
                    sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                    alt={image.description ? '' : 'Build image'}
                    width="400"
                    height="400"
                    decoding="async"
                    class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 transition-opacity {loaded[
                      image.id
                    ]
                      ? 'opacity-100'
                      : 'opacity-0'}"
                    loading="lazy"
                    onload={() => markLoaded(image.id)}
                    onerror={() => markLoaded(image.id)}
                  />
                </span>
              </button>

              <!-- Corner control cluster (siblings of the image-area button). Subtle
               scrim per-icon for legibility over any image. Zoom always shown;
               caption icon only when the image has a caption. -->
              <div class="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  class="btn btn-xs btn-circle border-none"
                  style="background: rgba(0, 0, 0, 0.55); color: white;"
                  onclick={() => handleClick(idx)}
                  title="View larger"
                  aria-label={`View image ${idx + 1} larger`}
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6zM10.5 7.5v6m3-3h-6"
                    />
                  </svg>
                </button>
                <CaptionPopover
                  caption={image.description}
                  label={`Show caption for image ${idx + 1}`}
                  triggerClass="btn btn-xs btn-circle border-none"
                  triggerStyle="background: rgba(0, 0, 0, 0.55); color: white;"
                />
              </div>

              <!-- Caption is the source of truth for the tile's accessible name; the
               <img alt=""> above avoids a double announcement. Visually hidden so
               the grid stays clean (peek via the caption icon / lightbox). -->
              {#if image.description}
                <figcaption class="sr-only">{image.description}</figcaption>
              {/if}
            </figure>
          {/each}
        </div>

        <!-- Bottom collapse control: closes this disclosure and scrolls back to
             its header so the user isn't stranded mid-page after collapsing a
             long gallery. Inside <details>, so it only shows when expanded. -->
        <div class="mt-4 pt-3 flex justify-center" style="border-top: 1px solid var(--border);">
          <button type="button" class="btn btn-xs btn-ghost" onclick={collapse}>
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            Collapse
          </button>
        </div>
      </div>
    </details>
  {:else}
    {#if block.header}
      <h3 class="text-xl font-semibold mb-3" style="color: var(--text-primary);">
        {block.header}
      </h3>
    {/if}
    <div
      class="p-6 rounded text-center"
      style="background: var(--background-muted); border: 1px dashed var(--border);"
    >
      <span style="color: var(--text-muted);">No images in this gallery yet.</span>
    </div>
  {/if}
</section>

<style>
  /* Remove the default disclosure triangle (we render our own chevron). */
  .gallery-cover::-webkit-details-marker {
    display: none;
  }
  .gallery-cover {
    list-style: none;
  }

  /* When expanded, divide the header row from the grid below so the two read as
     header→content of one card (the border + rounding live on <details>). */
  details[open] > .gallery-cover {
    border-bottom: 1px solid var(--border);
  }

  /* Chevron points down when collapsed; rotate to point up when open. */
  details[open] .chevron {
    transform: rotate(180deg);
  }
  .chevron {
    transition: transform 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>
