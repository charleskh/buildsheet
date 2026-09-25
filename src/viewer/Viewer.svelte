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
  import { LINK_LABELS, linkHref } from '$lib/state/build.svelte';
  import { safeHref } from '$lib/utils/safeHref';
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

  /**
   * Resolve links once, dropping anything the scheme allowlist rejects. A build
   * page is published by its owner, but it may be re-exported from data someone
   * else supplied, so the links get the same treatment as block content.
   */
  const links = $derived(
    (data.links ?? [])
      .filter((link) => link.value.trim() !== '')
      .map((link) => ({
        label: link.label?.trim() || LINK_LABELS[link.kind],
        href: safeHref(linkHref(link)),
        external: link.kind !== 'email'
      }))
      .filter((link): link is { label: string; href: string; external: boolean } =>
        link.href !== undefined
      )
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

<div class="bs-page">
  <header class="bs-hero">
    {#if data.coverImage}
      <img class="bs-hero-image" src={data.coverImage.url} alt="" fetchpriority="high" />
    {/if}
    <div class="bs-hero-text">
      <h1>{data.name}</h1>
      {#if data.description}<p class="bs-tagline">{data.description}</p>{/if}
      <p class="bs-byline">
        {#if data.author}<span>{data.author}</span>{/if}
        {#if data.author && started}<span aria-hidden="true">·</span>{/if}
        {#if started}<span>Started {started}</span>{/if}
      </p>
      {#if links.length}
        <ul class="bs-links">
          {#each links as link (link.href)}
            <li>
              <a href={link.href} rel={link.external ? 'noreferrer noopener' : null}
                 target={link.external ? '_blank' : null}>{link.label}</a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </header>

  <div class="bs-layout">
    <aside class="bs-toc"><BlockTableOfContents content={data.content} /></aside>
    <main>
      <BlockContentRenderer
        content={data.content}
        galleryImages={data.images}
        onImageClick={openLightbox}
      />
    </main>
  </div>

  <footer class="bs-site-footer">
    <p>
      Made with <strong>buildsheet</strong>. Make your own at
      <a href="https://charleskh.github.io/buildsheet">charleskh.github.io/buildsheet</a>
      or <a href="https://make.seethespecs.com">make.seethespecs.com</a>.
    </p>
    <p class="bs-footer-note">
      This page is plain HTML and images. It needs no server and no account, and it keeps working
      whether or not those links do.
    </p>
  </footer>
</div>

{#if lightbox}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="bs-lightbox" onclick={() => (lightbox = null)}>
    <img src={lightbox.images[lightbox.index].url} alt={lightbox.images[lightbox.index].description ?? ''} />
    <p class="bs-lightbox-caption">{lightbox.images[lightbox.index].description ?? ''}</p>
    <div class="bs-lightbox-controls">
      <button type="button" onclick={(e) => (e.stopPropagation(), step(-1))} disabled={lightbox.index === 0} aria-label="Previous photo">←</button>
      <span>{lightbox.index + 1} of {lightbox.images.length}</span>
      <button type="button" onclick={(e) => (e.stopPropagation(), step(1))} disabled={lightbox.index === lightbox.images.length - 1} aria-label="Next photo">→</button>
      <button type="button" onclick={() => (lightbox = null)} aria-label="Close">✕</button>
    </div>
  </div>
{/if}

<style>
  .bs-page { max-width: var(--content-wide, 80rem); margin: 0 auto; padding: 0 1rem 4rem; }
  .bs-hero { padding: 1.5rem 0; }
  /* The cover was framed to this exact shape in the editor, so the page shows
     what the owner chose rather than cropping it a second time. */
  .bs-hero-image {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
    margin-bottom: 1.25rem;
  }
  h1 { font-family: var(--font-family-heading, inherit); font-size: var(--text-4xl, 2.25rem); margin: 0 0 0.35rem; }
  .bs-tagline { color: var(--text-secondary, #bbb); margin: 0 0 0.5rem; font-size: var(--text-lg, 1.125rem); }
  .bs-byline { display: flex; flex-wrap: wrap; gap: 0.4rem; color: var(--text-muted, #999); margin: 0; font-size: var(--text-sm, 0.875rem); }
  .bs-links { display: flex; flex-wrap: wrap; gap: 0.4rem; list-style: none; padding: 0; margin: 0.75rem 0 0; }
  .bs-links a {
    display: inline-block;
    border: 1px solid var(--border, #444);
    padding: 0.15rem 0.6rem;
    font-size: var(--text-sm, 0.875rem);
    text-decoration: none;
  }
  .bs-links a:hover { border-color: var(--accent-primary, #bf8942); }
  .bs-layout { display: grid; grid-template-columns: 16rem 1fr; gap: 2rem; align-items: start; }
  .bs-toc { position: sticky; top: 1rem; }
  @media (max-width: 60rem) {
    .bs-layout { grid-template-columns: 1fr; }
    .bs-toc { position: static; }
  }
  .bs-site-footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--border-muted, #333); color: var(--text-muted, #999); font-size: var(--text-sm, 0.875rem); }
  .bs-footer-note { font-size: var(--text-xs, 0.75rem); }
  .bs-lightbox {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92); z-index: 999;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem;
  }
  .bs-lightbox img { max-width: 100%; max-height: 80vh; object-fit: contain; }
  .bs-lightbox-caption { color: #ddd; margin: 0; text-align: center; }
  .bs-lightbox-controls { display: flex; align-items: center; gap: 0.75rem; color: #ddd; }
</style>
