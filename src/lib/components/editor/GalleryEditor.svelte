<script lang="ts">
  import type { GalleryBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';
  import ImagePicker from './ImagePicker.svelte';

  let { block }: { block: GalleryBlock } = $props();

  // Resolve against images that actually exist. seethespecs build 1 has a gallery
  // listing 104 ids against 65 surviving rows, so trusting the id list is exactly
  // the bug that produces blank tiles.
  const tiles = $derived(
    block.imageIds.map((id) => ({ id, image: build.image(id) })).filter((t) => t.image)
  );

  function onadded(ids: number[]) {
    block.imageIds.push(...ids);
    build.touch();
  }
  function remove(id: number) {
    block.imageIds = block.imageIds.filter((i) => i !== id);
    if (block.coverImageId === id) block.coverImageId = undefined;
    build.removeImage(id);
  }
  function move(id: number, delta: -1 | 1) {
    const from = block.imageIds.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= block.imageIds.length) return;
    const [moved] = block.imageIds.splice(from, 1);
    block.imageIds.splice(to, 0, moved);
    build.touch();
  }
  function setCover(id: number) {
    block.coverImageId = id;
    build.touch();
  }
</script>

<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Engine, Interior, Paint" />
</label>

<ImagePicker label="Add photos to this gallery" {onadded} />

{#if block.imageIds.length !== tiles.length}
  <p class="field-warning">
    {block.imageIds.length - tiles.length} photo references point at images that are no longer here.
    They will be left out of the exported site.
  </p>
{/if}

<div class="grid">
  {#each tiles as tile (tile.id)}
    <figure class:cover={block.coverImageId === tile.id}>
      <img src={tile.image!.previewUrl} alt="" />
      <figcaption>
        <button type="button" onclick={() => move(tile.id, -1)} aria-label="Move earlier">←</button>
        <button type="button" onclick={() => setCover(tile.id)} aria-label="Use as cover tile">★</button>
        <button type="button" onclick={() => move(tile.id, 1)} aria-label="Move later">→</button>
        <button type="button" onclick={() => remove(tile.id)} aria-label="Remove photo">✕</button>
      </figcaption>
    </figure>
  {/each}
</div>

<p class="field-hint">{tiles.length} photo{tiles.length === 1 ? '' : 's'} in this gallery.</p>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); gap: 0.5rem; margin-top: 0.75rem; }
  figure { margin: 0; }
  figure.cover img { outline: 2px solid var(--accent-primary, #bf8942); outline-offset: -2px; }
  figure img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
  figcaption { display: flex; justify-content: center; gap: 0.15rem; }
</style>
