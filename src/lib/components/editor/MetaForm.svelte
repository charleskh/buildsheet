<script lang="ts">
  import {
    build,
    LINK_KINDS,
    LINK_LABELS,
    LINK_PLACEHOLDERS,
    type LinkKind
  } from '$lib/state/build.svelte';
  import { processOne, type CropRect } from '$lib/images/pipeline';
  import ImagePicker from './ImagePicker.svelte';
  import CoverCropper from './CoverCropper.svelte';

  const cover = $derived(build.meta.coverImageId ? build.image(build.meta.coverImageId) : undefined);
  let cropping = $state(false);
  let addingLink = $state(false);

  function onCoverAdded(ids: number[]) {
    if (ids.length) {
      build.meta.coverImageId = ids[0];
      build.touch();
    }
  }

  /** Re-render the cover from its original bytes using the new framing. */
  async function applyCrop(crop: CropRect) {
    cropping = false;
    const current = cover;
    if (!current?.sourceBytes) return;

    const file = new File([current.sourceBytes as unknown as BlobPart], `${current.baseName}.jpg`, {
      type: 'image/jpeg'
    });
    const reframed = await processOne(file, current.id, { crop, keepSource: true });
    build.replaceImage(reframed);
  }

  function addLink(kind: LinkKind) {
    build.meta.links.push({ kind, value: '' });
    addingLink = false;
    build.touch();
  }
  function removeLink(index: number) {
    build.meta.links.splice(index, 1);
    build.touch();
  }
</script>

<div class="bs-meta">
  <label class="form-field">
    <span>Build name</span>
    <input type="text" bind:value={build.meta.name} oninput={() => build.touch()} placeholder="1978 F150 4x4" />
  </label>

  <label class="form-field">
    <span>One line about it</span>
    <input type="text" bind:value={build.meta.description} oninput={() => build.touch()}
      placeholder="Regular cab, short bed, 1-ton axles and 40 inch tires." />
  </label>

  <div class="bs-pair">
    <label class="form-field">
      <span>Started</span>
      <input type="date" bind:value={build.meta.startDate} oninput={() => build.touch()} />
    </label>
    <label class="form-field">
      <span>Your name</span>
      <input type="text" bind:value={build.meta.author} oninput={() => build.touch()} placeholder="Shown as the byline" />
    </label>
  </div>

  <div class="form-field">
    <span>Cover photo</span>
    {#if cover}
      <img class="bs-cover" src={cover.previewUrl} alt="Cover" />
      {#if cover.sourceBytes}
        <button type="button" class="add-row" onclick={() => (cropping = true)}>Adjust framing</button>
      {/if}
    {/if}
    <ImagePicker
      multiple={false}
      asCover
      label={cover ? 'Replace cover photo' : 'Choose a cover photo'}
      onadded={onCoverAdded}
    />
    <p class="field-hint">Shown as a wide banner at the top of your page.</p>
  </div>

  <div class="form-field">
    <span>Where to find you</span>
    <p class="field-hint">Shown at the top of your build page. Leave it empty if you would rather not.</p>

    {#if build.meta.links.length}
      <ul class="bs-links">
        {#each build.meta.links as link, i (i)}
          <li>
            <span class="bs-link-kind">{LINK_LABELS[link.kind]}</span>
            <input
              type={link.kind === 'email' ? 'email' : 'url'}
              bind:value={link.value}
              oninput={() => build.touch()}
              placeholder={LINK_PLACEHOLDERS[link.kind]}
            />
            <button type="button" onclick={() => removeLink(i)} aria-label="Remove {LINK_LABELS[link.kind]} link">✕</button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if addingLink}
      <div class="bs-link-menu">
        {#each LINK_KINDS as kind (kind)}
          <button type="button" onclick={() => addLink(kind)}>{LINK_LABELS[kind]}</button>
        {/each}
        <button type="button" class="bs-cancel" onclick={() => (addingLink = false)}>Cancel</button>
      </div>
    {:else}
      <button type="button" class="add-row" onclick={() => (addingLink = true)}>Add a link</button>
    {/if}
  </div>
</div>

{#if cropping && cover?.sourceBytes}
  <CoverCropper
    source={cover.sourceBytes}
    initialCrop={cover.crop}
    oncancel={() => (cropping = false)}
    onconfirm={applyCrop}
  />
{/if}

<style>
  .bs-meta { display: flex; flex-direction: column; gap: 0.9rem; }
  .bs-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  @media (max-width: 40rem) { .bs-pair { grid-template-columns: 1fr; } }
  .bs-cover { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; margin-bottom: 0.5rem; }
  .bs-links { list-style: none; padding: 0; margin: 0 0 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .bs-links li { display: grid; grid-template-columns: 6.5rem 1fr auto; gap: 0.4rem; align-items: center; }
  .bs-link-kind { font-size: var(--text-sm, 0.875rem); color: var(--text-secondary, #bbb); }
  .bs-link-menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); gap: 0.4rem; }
  .bs-link-menu .bs-cancel { grid-column: 1 / -1; }
</style>
