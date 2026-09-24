<script lang="ts">
  import type { ImageBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';
  import ImagePicker from './ImagePicker.svelte';

  let { block }: { block: ImageBlock } = $props();
  const image = $derived(build.image(block.imageId));

  function onadded(ids: number[]) {
    if (ids.length === 0) return;
    // Replacing the photo drops the one this block owned.
    if (block.imageId && block.source === 'block') build.removeImage(block.imageId);
    block.imageId = ids[0];
    block.source = 'block';
    build.touch();
  }
</script>

{#if image}
  <img class="bs-preview" src={image.previewUrl} alt={block.caption || 'Selected photo'} />
{/if}
<ImagePicker multiple={false} label={image ? 'Replace photo' : 'Choose a photo'} {onadded} />
<label class="form-field">
  <span>Caption</span>
  <input type="text" bind:value={block.caption} oninput={() => build.touch()} placeholder="Optional" />
</label>

<style>
  .bs-preview { max-width: 100%; max-height: 16rem; display: block; margin-bottom: 0.5rem; }
</style>
