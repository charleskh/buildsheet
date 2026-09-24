<script lang="ts">
  /**
   * The generated build page.
   *
   * This renders with the same components the maker previews with, so the
   * exported site cannot drift from the preview. It reads its data from an
   * inline script tag, which means the page works from file:// as well as over
   * http: there is no fetch to fail.
   */
  import BlockContentRenderer from '$lib/components/blocks/BlockContentRenderer.svelte';
  import BlockTableOfContents from '$lib/components/blocks/BlockTableOfContents.svelte';
  import type { ModalImage } from '$lib/features/blocks/types';
  import type { SiteData } from './types';

  let { data }: { data: SiteData } = $props();

  let lightbox = $state<{ images: ModalImage[]; index: number } | null>(null);

  const started = $derived(
    data.startDate
      ? new Date(data.startDate + 'T00:00:00').toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long'
        })
      : ''
  );

  function openLightbox(images: ModalImage[], index: number) {
    lightbox = { images, index };
  }
  function step(delta: number) {
    if (!lightbox) return;
    const next = lightbox.index + delta;
    if (next >= 0 && next < lightbox.images.length) lightbox.index = next;
  }
  function onKey(event: KeyboardEvent) {
    if (!lightbox) return;
    if (event.key === 'Escape') lightbox = null;
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="page">
  <header class="hero">
    {#if data.coverImage}
      <img class="hero-image" src={data.coverImage.url} alt="" fetchpriority="high" />
    {/if}
    <div class="hero-text">
      <h1>{data.name}</h1>
      {#if data.description}<p class="tagline">{data.description}</p>{/if}
      <p class="byline">
        {#if data.author}<span>{data.author}</span>{/if}
        {#if data.author && started}<span aria-hidden="true">·</span>{/if}
        {#if started}<span>Started {started}</span>{/if}
        {#if data.category}<span aria-hidden="true">·</span><span>{data.category}</span>{/if}
      </p>
      {#if data.tags.length}
        <ul class="tags">
          {#each data.tags as tag (tag)}<li>{tag}</li>{/each}
        </ul>
      {/if}
    </div>
  </header>

  <div class="layout">
    <aside class="toc"><BlockTableOfContents content={data.content} /></aside>
    <main>
      <BlockContentRenderer
        content={data.content}
        galleryImages={data.images}
        onImageClick={openLightbox}
      />
    </main>
  </div>

  <footer class="site-footer">
    <p>
      Made with <strong>buildsheet</strong>. Make your own at
      <a href="https://charleskh.github.io/buildsheet">charleskh.github.io/buildsheet</a>
      or <a href="https://make.seethespecs.com">make.seethespecs.com</a>.
    </p>
    <p class="footer-note">
      This page is plain HTML and images. It needs no server and no account, and it keeps working
      whether or not those links do.
    </p>
  </footer>
</div>

{#if lightbox}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="lightbox" onclick={() => (lightbox = null)}>
    <img src={lightbox.images[lightbox.index].url} alt={lightbox.images[lightbox.index].description ?? ''} />
    <p class="lightbox-caption">{lightbox.images[lightbox.index].description ?? ''}</p>
    <div class="lightbox-controls">
      <button type="button" onclick={(e) => (e.stopPropagation(), step(-1))} disabled={lightbox.index === 0} aria-label="Previous photo">←</button>
      <span>{lightbox.index + 1} of {lightbox.images.length}</span>
      <button type="button" onclick={(e) => (e.stopPropagation(), step(1))} disabled={lightbox.index === lightbox.images.length - 1} aria-label="Next photo">→</button>
      <button type="button" onclick={() => (lightbox = null)} aria-label="Close">✕</button>
    </div>
  </div>
{/if}

<style>
  .page { max-width: var(--content-wide, 80rem); margin: 0 auto; padding: 0 1rem 4rem; }
  .hero { padding: 1.5rem 0; }
  .hero-image { width: 100%; max-height: 32rem; object-fit: cover; display: block; margin-bottom: 1.25rem; }
  h1 { font-family: var(--font-family-heading, inherit); font-size: var(--text-4xl, 2.25rem); margin: 0 0 0.35rem; }
  .tagline { color: var(--text-secondary, #bbb); margin: 0 0 0.5rem; font-size: var(--text-lg, 1.125rem); }
  .byline { display: flex; flex-wrap: wrap; gap: 0.4rem; color: var(--text-muted, #999); margin: 0; font-size: var(--text-sm, 0.875rem); }
  .tags { display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; padding: 0; margin: 0.75rem 0 0; }
  .tags li { border: 1px solid var(--border, #444); padding: 0.1rem 0.5rem; font-size: var(--text-xs, 0.75rem); }
  .layout { display: grid; grid-template-columns: 16rem 1fr; gap: 2rem; align-items: start; }
  .toc { position: sticky; top: 1rem; }
  @media (max-width: 60rem) {
    .layout { grid-template-columns: 1fr; }
    .toc { position: static; }
  }
  .site-footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--border-muted, #333); color: var(--text-muted, #999); font-size: var(--text-sm, 0.875rem); }
  .footer-note { font-size: var(--text-xs, 0.75rem); }
  .lightbox {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); z-index: 999;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem;
  }
  .lightbox img { max-width: 100%; max-height: 80vh; object-fit: contain; }
  .lightbox-caption { color: #ddd; margin: 0; text-align: center; }
  .lightbox-controls { display: flex; align-items: center; gap: 0.75rem; color: #ddd; }
</style>
