<script lang="ts">
  import { onMount } from 'svelte';
  import { build } from '$lib/state/build.svelte';
  import { startAutosave, loadDraft } from '$lib/state/persist';
  import BlockList from '$lib/components/editor/BlockList.svelte';
  import MetaForm from '$lib/components/editor/MetaForm.svelte';
  import StartPanel from '$lib/components/StartPanel.svelte';
  import PublishPanel from '$lib/components/PublishPanel.svelte';
  import BlockContentRenderer from '$lib/components/blocks/BlockContentRenderer.svelte';

  type Tab = 'build' | 'preview' | 'publish';

  let started = $state(false);
  let tab = $state<Tab>('build');
  let draft = $state<{ savedAt: number; name: string } | null>(null);
  let theme = $state<'dark' | 'light'>('dark');

  onMount(() => {
    void loadDraft().then((found) => (draft = found));
    const stop = startAutosave();

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

<header class="topbar">
  <div class="brand">
    <h1 class="wordmark">buildsheet</h1>
    {#if started && build.meta.name}<span class="current">{build.meta.name}</span>{/if}
  </div>
  <div class="topbar-actions">
    {#if started}
      <nav class="tabs" aria-label="Sections">
        <button type="button" class:active={tab === 'build'} onclick={() => (tab = 'build')}>Build</button>
        <button type="button" class:active={tab === 'preview'} onclick={() => (tab = 'preview')}>Preview</button>
        <button type="button" class:active={tab === 'publish'} onclick={() => (tab = 'publish')}>Publish</button>
      </nav>
    {/if}
    <button
      type="button"
      class="theme"
      onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}
      aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  </div>
</header>

<main class="shell">
  {#if !started}
    <StartPanel {draft} ondone={() => (started = true)} />
  {:else if tab === 'build'}
    <div class="columns">
      <section class="pane">
        <h2>About the build</h2>
        <MetaForm />
      </section>
      <section class="pane">
        <h2>Sections</h2>
        <BlockList />
      </section>
    </div>
  {:else if tab === 'preview'}
    <div class="preview-pane">
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

<footer class="appfoot">
  <p>
    buildsheet runs entirely in this browser. Nothing you add is uploaded.
    <a href="https://charleskh.github.io/buildsheet">charleskh.github.io/buildsheet</a>
  </p>
</footer>

<style>
  .topbar {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 0.6rem 1rem; border-bottom: 1px solid var(--border, #444);
    background: var(--surface, #141414); position: sticky; top: 0; z-index: 20;
  }
  .brand { display: flex; align-items: baseline; gap: 0.75rem; min-width: 0; }
  /* The wordmark is the page heading, so the maker has a real h1 rather than
     starting the document outline at h2. */
  .wordmark {
    font-family: var(--font-family-heading, inherit);
    font-weight: 700;
    letter-spacing: 0.02em;
    font-size: var(--text-lg, 1.125rem);
    margin: 0;
  }
  .current { color: var(--text-muted, #999); font-size: var(--text-sm, 0.875rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .topbar-actions { display: flex; align-items: center; gap: 0.5rem; }
  .tabs { display: flex; gap: 0.25rem; }
  .tabs button.active { border-color: var(--accent-primary, #bf8942); color: var(--accent-primary, #bf8942); }
  .theme { min-width: 2.25rem; }
  .shell { max-width: 80rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  .columns { display: grid; grid-template-columns: 22rem 1fr; gap: 1.5rem; align-items: start; }
  @media (max-width: 64rem) { .columns { grid-template-columns: 1fr; } }
  .pane h2 { font-family: var(--font-family-heading, inherit); font-size: var(--text-xl, 1.25rem); margin: 0 0 0.75rem; }
  .preview-pane { border: 1px solid var(--border-muted, #333); padding: 1.25rem; background: var(--surface, #141414); }
  .appfoot { border-top: 1px solid var(--border-muted, #333); padding: 1rem; text-align: center; color: var(--text-muted, #999); font-size: var(--text-xs, 0.75rem); }
</style>
