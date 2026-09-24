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

<div class="bs-grid">
  {#each tiles as tile (tile.id)}
    <figure class:bs-cover={block.coverImageId === tile.id}>
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
  .bs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); gap: 0.6rem; margin-top: 0.75rem; }
  figure { margin: 0; }
  figure.bs-cover img { outline: 2px solid var(--accent-primary, #bf8942); outline-offset: -2px; }
  figure img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
  figcaption { display: flex; justify-content: center; gap: 0.15rem; }
  /* Four controls have to fit the width of one tile, so they drop the comfortable
     tap target the rest of the interface uses and rely on the tile for spacing. */
  figcaption button {
    flex: 1 1 0;
    min-width: 0;
    min-height: 1.9rem;
    padding: 0.2rem 0;
    font-size: var(--text-xs, 0.75rem);
    line-height: 1;
  }
</style>
