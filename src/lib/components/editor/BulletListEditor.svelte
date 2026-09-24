<script lang="ts">
  import type { BulletListBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';

  let { block }: { block: BulletListBlock } = $props();

  function addItem() {
    block.items.push({ text: '' });
    build.touch();
  }
  function removeItem(index: number) {
    block.items.splice(index, 1);
    build.touch();
  }
  function addSubItem(index: number) {
    const item = block.items[index];
    item.subItems = item.subItems ?? [];
    item.subItems.push({ text: '' });
    build.touch();
  }
  function removeSubItem(index: number, subIndex: number) {
    block.items[index].subItems?.splice(subIndex, 1);
    build.touch();
  }
</script>

<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Optional" />
</label>

<div class="items">
  {#each block.items as item, i (i)}
    <div class="item">
      <div class="item-head">
        <input type="text" bind:value={item.text} oninput={() => build.touch()} placeholder="Item" />
        <button type="button" onclick={() => addSubItem(i)} aria-label="Add a sub item">+</button>
        <button type="button" onclick={() => removeItem(i)} aria-label="Remove item">✕</button>
      </div>
      {#if item.subItems?.length}
        <div class="subs">
          {#each item.subItems as sub, j (j)}
            <div class="sub">
              <input type="text" bind:value={sub.text} oninput={() => build.touch()} placeholder="Sub item" />
              <button type="button" onclick={() => removeSubItem(i, j)} aria-label="Remove sub item">✕</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<button type="button" class="add-row" onclick={addItem}>Add an item</button>

<style>
  .items { display: flex; flex-direction: column; gap: 0.5rem; }
  .item-head { display: grid; grid-template-columns: 1fr auto auto; gap: 0.5rem; }
  .subs { display: flex; flex-direction: column; gap: 0.35rem; margin: 0.35rem 0 0 1.5rem; }
  .sub { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; }
</style>
