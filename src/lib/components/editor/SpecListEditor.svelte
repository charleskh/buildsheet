<script lang="ts">
  import type { SpecListBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';

  let { block }: { block: SpecListBlock } = $props();

  function addRow() {
    block.items.push({ key: '', value: '' });
    build.touch();
  }
  function removeRow(index: number) {
    block.items.splice(index, 1);
    build.touch();
  }
  function move(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= block.items.length) return;
    const [row] = block.items.splice(index, 1);
    block.items.splice(to, 0, row);
    build.touch();
  }
</script>

<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Specifications" />
</label>

<div class="bs-rows">
  {#each block.items as item, i (i)}
    <div class="bs-row">
      <input class="row-key" type="text" bind:value={item.key} oninput={() => build.touch()} placeholder="Part" />
      <input class="row-value" type="text" bind:value={item.value} oninput={() => build.touch()} placeholder="What it is" />
      <input class="row-price" type="text" bind:value={item.price} oninput={() => build.touch()} placeholder="Price" />
      <div class="bs-row-actions">
        <button type="button" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
        <button type="button" onclick={() => move(i, 1)} disabled={i === block.items.length - 1} aria-label="Move down">↓</button>
        <button type="button" onclick={() => removeRow(i)} aria-label="Remove row">✕</button>
      </div>
    </div>
  {/each}
</div>

<button type="button" class="add-row" onclick={addRow}>Add a row</button>
<p class="field-hint">Prices are free text. Anything that reads as a number is added into a total.</p>

<style>
  .bs-rows { display: flex; flex-direction: column; gap: 0.5rem; }
  .bs-row { display: grid; grid-template-columns: 1fr 1.4fr 0.6fr auto; gap: 0.5rem; align-items: center; }
  @media (max-width: 40rem) { .bs-row { grid-template-columns: 1fr; } }
  .bs-row-actions { display: flex; gap: 0.25rem; }
</style>
