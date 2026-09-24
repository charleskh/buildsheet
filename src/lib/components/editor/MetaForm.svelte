<script lang="ts">
  import { build } from '$lib/state/build.svelte';
  import ImagePicker from './ImagePicker.svelte';

  let tagInput = $state('');
  const cover = $derived(build.meta.coverImageId ? build.image(build.meta.coverImageId) : undefined);

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !build.meta.tags.includes(tag)) {
      build.meta.tags.push(tag);
      build.touch();
    }
    tagInput = '';
  }
  function removeTag(tag: string) {
    build.meta.tags = build.meta.tags.filter((t) => t !== tag);
    build.touch();
  }
  function onCoverAdded(ids: number[]) {
    if (ids.length) {
      build.meta.coverImageId = ids[0];
      build.touch();
    }
  }
</script>

<div class="meta">
  <label class="form-field">
    <span>Build name</span>
    <input type="text" bind:value={build.meta.name} oninput={() => build.touch()} placeholder="1978 F150 4x4" />
  </label>

  <label class="form-field">
    <span>One line about it</span>
    <input type="text" bind:value={build.meta.description} oninput={() => build.touch()}
      placeholder="Regular cab, short bed, 1-ton axles and 40 inch tires." />
  </label>

  <div class="pair">
    <label class="form-field">
      <span>Started</span>
      <input type="date" bind:value={build.meta.startDate} oninput={() => build.touch()} />
    </label>
    <label class="form-field">
      <span>Category</span>
      <input type="text" bind:value={build.meta.category} oninput={() => build.touch()} placeholder="Truck" />
    </label>
  </div>

  <label class="form-field">
    <span>Your name</span>
    <input type="text" bind:value={build.meta.author} oninput={() => build.touch()} placeholder="Shown as the byline" />
  </label>

  <div class="form-field">
    <span>Cover photo</span>
    {#if cover}<img class="cover" src={cover.previewUrl} alt="Cover" />{/if}
    <ImagePicker multiple={false} label={cover ? 'Replace cover photo' : 'Choose a cover photo'} onadded={onCoverAdded} />
  </div>

  <div class="form-field">
    <span>Tags</span>
    <div class="tag-input">
      <input type="text" bind:value={tagInput} placeholder="Ford"
        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
      <button type="button" onclick={addTag}>Add</button>
    </div>
    {#if build.meta.tags.length}
      <ul class="tags">
        {#each build.meta.tags as tag (tag)}
          <li><button type="button" onclick={() => removeTag(tag)} aria-label="Remove tag {tag}">{tag} ✕</button></li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .meta { display: flex; flex-direction: column; gap: 0.9rem; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  @media (max-width: 40rem) { .pair { grid-template-columns: 1fr; } }
  .cover { max-width: 100%; max-height: 12rem; display: block; margin-bottom: 0.5rem; }
  .tag-input { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; padding: 0; margin: 0.5rem 0 0; }
</style>
