<script lang="ts">
  import type { TimelineBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';

  let { block }: { block: TimelineBlock } = $props();

  function addEntry() {
    block.entries.push({ date: '', title: '', description: '' });
    build.touch();
  }
  function removeEntry(index: number) {
    block.entries.splice(index, 1);
    build.touch();
  }
</script>

<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Timeline" />
</label>

<div class="bs-entries">
  {#each block.entries as entry, i (i)}
    <div class="bs-entry">
      <div class="bs-entry-head">
        <input type="text" bind:value={entry.date} oninput={() => build.touch()} placeholder="March 2024" />
        <input type="text" bind:value={entry.title} oninput={() => build.touch()} placeholder="What happened" />
        <button type="button" onclick={() => removeEntry(i)} aria-label="Remove entry">✕</button>
      </div>
      <textarea rows="2" bind:value={entry.description} oninput={() => build.touch()}
        placeholder="Detail, optional"></textarea>
    </div>
  {/each}
</div>

<button type="button" class="add-row" onclick={addEntry}>Add an entry</button>

<style>
  .bs-entries { display: flex; flex-direction: column; gap: 0.75rem; }
  .bs-entry { display: flex; flex-direction: column; gap: 0.35rem; }
  .bs-entry-head { display: grid; grid-template-columns: 0.7fr 1.6fr auto; gap: 0.5rem; }
  @media (max-width: 40rem) { .bs-entry-head { grid-template-columns: 1fr; } }
</style>
