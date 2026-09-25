<script lang="ts">
  import { loadFromZip } from '$lib/import/reload';
  import { importFromSeeTheSpecs, ImportBlockedError, type ImportProgress } from '$lib/import/seethespecs';
  import { UnsupportedZipError } from '$lib/export/unzip';
  import { openDraft, deleteDraft, startNewDraft, type DraftSummary } from '$lib/state/persist';

  let {
    drafts,
    onrefresh,
    ondone
  }: {
    drafts: DraftSummary[];
    onrefresh: () => void;
    ondone: () => void;
  } = $props();

  let stsRef = $state('');
  let progress = $state<ImportProgress | null>(null);
  let message = $state('');
  let error = $state('');
  let zipInput = $state<HTMLInputElement | null>(null);

  function when(ms: number): string {
    if (!ms) return 'unknown';
    const days = Math.floor((Date.now() - ms) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(ms).toLocaleDateString();
  }

  async function open(id: string) {
    if (await openDraft(id)) ondone();
    else error = 'That build could not be opened.';
  }

  async function remove(draft: DraftSummary) {
    if (!confirm(`Delete "${draft.name}"? This only removes the copy saved in this browser.`)) return;
    await deleteDraft(draft.id);
    onrefresh();
  }

  function startFresh() {
    startNewDraft();
    ondone();
  }

  async function doImport() {
    error = '';
    message = '';
    try {
      const result = await importFromSeeTheSpecs(stsRef, (p) => (progress = p));
      message = `Brought across ${result.imported} photo${result.imported === 1 ? '' : 's'}.`;
      if (result.failed) message += ` ${result.failed} could not be fetched.`;
      if (result.danglingRefs) {
        message += ` ${result.danglingRefs} photo references point at images that no longer exist and were left out.`;
      }
      progress = null;
      startNewDraft();
      ondone();
    } catch (e) {
      progress = null;
      error = e instanceof ImportBlockedError ? e.message : 'That import did not work.';
    }
  }

  async function handleZip(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    error = '';
    try {
      const result = await loadFromZip(file);
      message = `Loaded ${result.imported} photo${result.imported === 1 ? '' : 's'}.`;
      startNewDraft();
      ondone();
    } catch (e) {
      error = e instanceof UnsupportedZipError ? e.message : 'That file could not be read.';
    }
  }
</script>

<div class="bs-start">
  <section class="bs-intro">
    <h2>Make a build page you can host anywhere</h2>
    <p>
      Fill in your build, add your photos, and download a finished website. Everything happens on
      your own computer. There is no account, nothing is uploaded here, and there is no server
      behind this page.
    </p>
  </section>

  {#if drafts.length}
    <section class="bs-card bs-highlight">
      <h3>Your builds</h3>
      <p>Saved in this browser, on this machine.</p>
      <ul class="bs-drafts">
        {#each drafts as draft (draft.id)}
          <li>
            <button type="button" class="bs-open" onclick={() => open(draft.id)}>
              <strong>{draft.name}</strong>
              <span>
                {draft.blockCount} section{draft.blockCount === 1 ? '' : 's'},
                {draft.photoCount} photo{draft.photoCount === 1 ? '' : 's'},
                saved {when(draft.savedAt)}
              </span>
            </button>
            <button type="button" onclick={() => remove(draft)} aria-label="Delete {draft.name}">✕</button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="bs-card">
    <h3>Start a new build</h3>
    <p>An empty page to fill in.</p>
    <button type="button" class="primary" onclick={startFresh}>Start</button>
  </section>

  <section class="bs-card">
    <h3>Load a site I made earlier</h3>
    <p>Pick the zip buildsheet gave you and carry on editing it.</p>
    <input bind:this={zipInput} type="file" accept=".zip,application/zip" onchange={handleZip} hidden />
    <button type="button" onclick={() => zipInput?.click()}>Choose my zip</button>
  </section>

  <section class="bs-card">
    <h3>Bring a build over from seethespecs</h3>
    <p>Paste the address of a public build and it will be copied here, photos and all.</p>
    <div class="bs-row">
      <input type="text" bind:value={stsRef} placeholder="seethespecs.com/builds/1" />
      <button type="button" onclick={doImport} disabled={progress !== null || !stsRef}>Bring it over</button>
    </div>
    {#if progress}
      <div class="bs-progress" role="status" aria-live="polite">
        <div class="bs-bar"><div class="bs-fill" style="width:{(progress.done / Math.max(1, progress.total)) * 100}%"></div></div>
        <p>{progress.message}</p>
      </div>
    {/if}
  </section>

  {#if message}<p class="field-hint">{message}</p>{/if}
  {#if error}<p class="field-warning">{error}</p>{/if}
</div>

<style>
  .bs-start { display: flex; flex-direction: column; gap: 1rem; max-width: 42rem; margin: 0 auto; }
  .bs-intro h2 { font-family: var(--font-family-heading, inherit); margin: 0 0 0.5rem; }
  .bs-intro p { color: var(--text-secondary, #bbb); margin: 0; }
  .bs-card { border: 1px solid var(--border, #444); background: var(--surface, #141414); padding: 1rem; }
  .bs-card.bs-highlight { border-color: var(--accent-primary, #bf8942); }
  .bs-card h3 { margin: 0 0 0.25rem; }
  .bs-card p { margin: 0 0 0.75rem; color: var(--text-muted, #999); font-size: var(--text-sm, 0.875rem); }
  .bs-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .bs-row input { flex: 1 1 14rem; }
  .bs-drafts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .bs-drafts li { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; }
  .bs-open { text-align: left; display: flex; flex-direction: column; gap: 0.15rem; padding: 0.5rem 0.65rem; }
  .bs-open span { font-size: var(--text-xs, 0.75rem); color: var(--text-muted, #999); font-weight: 400; }
  .bs-progress { margin-top: 0.75rem; }
  .bs-bar { height: 6px; background: var(--surface-sunken, #333); overflow: hidden; }
  .bs-fill { height: 100%; background: var(--accent-primary, #bf8942); transition: width 120ms linear; }
</style>
