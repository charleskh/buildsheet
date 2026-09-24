<!--
  @component VideoBlockRenderer
  Read-only display for video blocks: an optional heading, a responsive 16:9
  embedded YouTube/Vimeo player, and an optional caption.

  The embed is lazy-loaded (`loading="lazy"`) and uses the privacy-friendly
  embed hosts (youtube-nocookie.com / player.vimeo.com). For print — where an
  iframe is meaningless — the embed is hidden and a clickable watch URL is shown
  instead. The same fallback covers an unparseable URL.
-->
<script lang="ts">
  import type { VideoBlock } from '$lib/features/blocks/types';
  import { parseVideoUrl } from '$lib/features/blocks/video';
  import { safeHref } from '$lib/utils/safeHref';

  interface Props {
    block: VideoBlock;
  }

  let { block }: Props = $props();

  const video = $derived(parseVideoUrl(block.url));
  const title = $derived(block.caption || block.header || 'Embedded video');
  /** Safe href for the fallback link when the URL isn't a recognized embed. */
  const fallbackHref = $derived(safeHref(block.url));
</script>

<section>
  {#if block.header}
    <h3 class="text-xl font-semibold mb-3" style="color: var(--text-primary);">
      {block.header}
    </h3>
  {/if}

  {#if video}
    <!-- Responsive 16:9 frame. print:hidden because an iframe can't print. -->
    <div
      class="relative w-full overflow-hidden rounded print:hidden"
      style="aspect-ratio: 16 / 9; background: var(--background-muted);"
    >
      <iframe
        src={video.embedUrl}
        {title}
        class="absolute inset-0 h-full w-full"
        style="border: 0;"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>

    <!-- Print-only watch link (the iframe above is hidden when printing). -->
    <p class="hidden print:block text-sm" style="color: var(--text-muted);">
      Watch: <a href={video.watchUrl}>{video.watchUrl}</a>
    </p>

    {#if block.caption}
      <p class="text-center text-sm mt-2" style="color: var(--text-muted);">
        {block.caption}
      </p>
    {/if}
  {:else if block.url}
    <!-- URL present but unrecognized: show a plain link rather than nothing.
         When the URL has an unsafe scheme, show the text without an anchor. -->
    <div
      class="p-4 rounded text-center"
      style="background: var(--background-muted); border: 1px dashed var(--border);"
    >
      {#if fallbackHref}
        <a
          href={fallbackHref}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style="color: var(--text-link);"
        >
          {block.url}
        </a>
      {:else}
        <span style="color: var(--text-muted);">{block.url}</span>
      {/if}
    </div>
  {:else}
    <div
      class="p-6 rounded text-center"
      style="background: var(--background-muted); border: 1px dashed var(--border);"
    >
      <span style="color: var(--text-muted);">No video added yet.</span>
    </div>
  {/if}
</section>
