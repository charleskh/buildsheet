<script lang="ts">
  import type { VideoBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';
  import { parseVideoUrl } from '$lib/features/blocks/video';

  let { block }: { block: VideoBlock } = $props();
  // Videos are embedded, never uploaded, so the only thing to validate is whether
  // the pasted link is one we know how to embed.
  const parsed = $derived(block.url ? parseVideoUrl(block.url) : null);
</script>

<label class="form-field">
  <span>YouTube or Vimeo link</span>
  <input type="url" bind:value={block.url} oninput={() => build.touch()}
    placeholder="https://www.youtube.com/watch?v=..." />
</label>
{#if block.url && !parsed}
  <p class="field-warning">That link is not a YouTube or Vimeo video we recognise.</p>
{:else if parsed}
  <p class="field-hint">Recognised. The video will be embedded, not uploaded.</p>
{/if}
<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Optional" />
</label>
<label class="form-field">
  <span>Caption</span>
  <input type="text" bind:value={block.caption} oninput={() => build.touch()} placeholder="Optional" />
</label>
