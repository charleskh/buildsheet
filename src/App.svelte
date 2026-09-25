<script lang="ts">
  import { onMount } from 'svelte';
  import { build } from '$lib/state/build.svelte';
  import {
    startAutosave,
    listDrafts,
    migrateLegacyDraft,
    startNewDraft,
    type DraftSummary
  } from '$lib/state/persist';
  import { isSiteEditor, loadFromCurrentSite, SiteLoadError, type SiteLoadProgress } from '$lib/import/fromSite';
  import BlockList from '$lib/components/editor/BlockList.svelte';
  import MetaForm from '$lib/components/editor/MetaForm.svelte';
  import StartPanel from '$lib/components/StartPanel.svelte';
  import PublishPanel from '$lib/components/PublishPanel.svelte';
  import BlockContentRenderer from '$lib/components/blocks/BlockContentRenderer.svelte';

  type Tab = 'build' | 'preview' | 'publish';

  const siteMode = isSiteEditor();

  let started = $state(false);
  let tab = $state<Tab>('build');
  let drafts = $state<DraftSummary[]>([]);
  let theme = $state<'dark' | 'light'>('dark');
  let siteProgress = $state<SiteLoadProgress | null>(null);
  let siteError = $state('');
  let noticeDismissed = $state(false);

  async function refreshDrafts() {
    drafts = await listDrafts();
  }

  onMount(() => {
    const stop = startAutosave();

    if (siteMode) {
      // Published alongside a build, so open that build rather than the menu.
      startNewDraft();
      siteProgress = { done: 0, total: 1, message: 'Reading this build' };
      void loadFromCurrentSite((p) => (siteProgress = p))
        .then(() => {
          siteProgress = null;
          started = true;
        })
        .catch((error) => {
          siteProgress = null;
          siteError = error instanceof SiteLoadError ? error.message : 'This build could not be opened.';
        });
    } else {
      void migrateLegacyDraft().then(refreshDrafts);
    }

    try {
      const saved = localStorage.getItem('buildsheet-theme');
      if (saved === 'light' || saved === 'dark') theme = saved;
    } catch {
      // Storage can be denied. The default theme is fine.
    }
    return stop;
  });

  $effect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('buildsheet-theme', theme);
    } catch {
      // A remembered theme is a convenience, never a requirement.
    }
  });

  // Leaving with unsaved work is the one thing a person cannot undo, because
  // there is no account to recover it from.
  $effect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!build.isEmpty) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
</script>

<header class="bs-topbar">
  <div class="bs-brand">
    <h1 class="bs-wordmark">buildsheet</h1>
    {#if started && build.meta.name}<span class="bs-current">{build.meta.name}</span>{/if}
  </div>
  <div class="bs-topbar-actions">
    {#if started}
      <nav class="bs-tabs" aria-label="Sections">
        <button type="button" class:bs-active={tab === 'build'} onclick={() => (tab = 'build')}>Build</button>
        <button type="button" class:bs-active={tab === 'preview'} onclick={() => (tab = 'preview')}>Preview</button>
        <button type="button" class:bs-active={tab === 'publish'} onclick={() => (tab = 'publish')}>Publish</button>
      </nav>
    {/if}
    <button
      type="button"
      class="bs-theme"
      onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}
      aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  </div>
</header>

{#if siteMode && started && !noticeDismissed}
  <!--
    Anyone can open this page, so say plainly what it does and does not do.
    Nothing here writes back to the site: publishing an update means uploading
    to hosting, which only the owner can do. For everyone else this is a copy,
    which is a perfectly good way to start your own.
  -->
  <aside class="bs-notice" role="note">
    <div>
      <strong>You are editing a copy in your own browser.</strong>
      Nothing you change here touches the published page. To put an update live you download it and
      upload it to your own hosting, so only whoever runs this site can change it.
      <span class="bs-notice-soft">
        If this build is not yours, you are welcome to use it as a template. Replace the name, photos
        and links with your own.
      </span>
    </div>
    <button type="button" onclick={() => (noticeDismissed = true)} aria-label="Dismiss">✕</button>
  </aside>
{/if}

<main class="bs-shell">
  {#if siteProgress}
    <div class="bs-loading" role="status" aria-live="polite">
      <div class="bs-bar"><div class="bs-fill" style="width:{(siteProgress.done / Math.max(1, siteProgress.total)) * 100}%"></div></div>
      <p>{siteProgress.message}</p>
      <p class="field-hint">Reading this build straight from the page, so you can change it.</p>
    </div>
  {:else if siteError}
    <p class="field-warning">{siteError}</p>
  {:else if !started}
    <StartPanel {drafts} onrefresh={refreshDrafts} ondone={() => (started = true)} />
  {:else if tab === 'build'}
    <div class="bs-columns">
      <section class="bs-pane">
        <h2>About the build</h2>
        <MetaForm />
      </section>
      <section class="bs-pane">
        <h2>Sections</h2>
        <BlockList />
      </section>
    </div>
  {:else if tab === 'preview'}
    <div class="bs-preview-pane">
      {#if build.blocks.length === 0}
        <p class="field-hint">Nothing to preview yet. Add a section on the Build tab.</p>
      {:else}
        <BlockContentRenderer content={build.content()} galleryImages={build.buildImages('preview')} />
      {/if}
    </div>
  {:else}
    <PublishPanel />
  {/if}
</main>

<footer class="bs-appfoot">
  <p>
    buildsheet runs entirely in this browser. Nothing you add is uploaded.
    <a href="https://charleskh.github.io/buildsheet">charleskh.github.io/buildsheet</a>
  </p>
</footer>

<style>
  .bs-topbar {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 0.6rem 1rem; border-bottom: 1px solid var(--border, #444);
    background: var(--surface, #141414); position: sticky; top: 0; z-index: 20;
  }
  .bs-brand { display: flex; align-items: baseline; gap: 0.75rem; min-width: 0; }
  /* The wordmark is the page heading, so the maker has a real h1 rather than
     starting the document outline at h2. */
  .bs-wordmark {
    font-family: var(--font-family-heading, inherit);
    font-weight: 700;
    letter-spacing: 0.02em;
    font-size: var(--text-lg, 1.125rem);
    margin: 0;
  }
  .bs-current { color: var(--text-muted, #999); font-size: var(--text-sm, 0.875rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bs-topbar-actions { display: flex; align-items: center; gap: 0.5rem; }
  .bs-tabs { display: flex; gap: 0.25rem; }
  .bs-tabs button.bs-active { border-color: var(--accent-primary, #bf8942); color: var(--accent-primary, #bf8942); }
  .bs-theme { min-width: 2.25rem; }
  .bs-notice {
    display: flex; gap: 1rem; align-items: flex-start;
    max-width: 80rem; margin: 1rem auto 0; padding: 0.75rem 1rem;
    border: 1px solid var(--accent-primary, #bf8942);
    background: var(--surface, #141414);
    font-size: var(--text-sm, 0.875rem);
  }
  .bs-notice-soft { display: block; margin-top: 0.35rem; color: var(--text-muted, #999); }
  .bs-shell { max-width: 80rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  .bs-columns { display: grid; grid-template-columns: 22rem 1fr; gap: 1.5rem; align-items: start; }
  @media (max-width: 64rem) { .bs-columns { grid-template-columns: 1fr; } }
  .bs-pane h2 { font-family: var(--font-family-heading, inherit); font-size: var(--text-xl, 1.25rem); margin: 0 0 0.75rem; }
  .bs-preview-pane { border: 1px solid var(--border-muted, #333); padding: 1.25rem; background: var(--surface, #141414); }
  .bs-appfoot { border-top: 1px solid var(--border-muted, #333); padding: 1rem; text-align: center; color: var(--text-muted, #999); font-size: var(--text-xs, 0.75rem); }
  .bs-loading { max-width: 32rem; margin: 3rem auto; text-align: center; }
  .bs-bar { height: 6px; background: var(--surface-sunken, #333); overflow: hidden; }
  .bs-fill { height: 100%; background: var(--accent-primary, #bf8942); transition: width 120ms linear; }
</style>
