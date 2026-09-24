<script lang="ts">
  import { loadFromZip } from '$lib/import/reload';
  import { importFromSeeTheSpecs, ImportBlockedError, type ImportProgress } from '$lib/import/seethespecs';
  import { UnsupportedZipError } from '$lib/export/unzip';
  import { restoreDraft, clearDraft } from '$lib/state/persist';

  let { draft, ondone }: { draft: { savedAt: number; name: string } | null; ondone: () => void } = $props();

  let stsRef = $state('');
  let progress = $state<ImportProgress | null>(null);
  let message = $state('');
  let error = $state('');
  let zipInput = $state<HTMLInputElement | null>(null);

  async function doRestore() {
    if (await restoreDraft()) ondone();
    else error = 'That draft could not be opened.';
  }

  async function discardDraft() {
    await clearDraft();
    location.reload();
  }

  async function doImport() {
    error = '';
    message = '';
    try {
      const result = await importFromSeeTheSpecs(stsRef, (p) => (progress = p));
      message = `Brought across ${result.imported} photo${result.imported === 1 ? '' : 's'}.`;
      if (result.failed) message += ` ${result.failed} could not be fetched.`;
      if (result.danglingRefs) {
        message += ` ${result.danglingRefs} photo references in the build point at images that no longer exist and were left out.`;
      }
      progress = null;
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

  {#if draft}
    <section class="bs-card bs-highlight">
      <h3>You have unsaved work</h3>
      <p>
        {draft.name || 'An unnamed build'}, last saved
        {new Date(draft.savedAt).toLocaleString()}.
      </p>
      <div class="bs-row">
        <button type="button" class="primary" onclick={doRestore}>Pick up where I left off</button>
        <button type="button" onclick={discardDraft}>Start over</button>
      </div>
    </section>
  {/if}

  <section class="bs-card">
    <h3>Start a new build</h3>
    <p>An empty page to fill in.</p>
    <button type="button" class="primary" onclick={ondone}>Start</button>
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
  .bs-progress { margin-top: 0.75rem; }
  .bs-bar { height: 6px; background: var(--surface-sunken, #333); overflow: hidden; }
  .bs-fill { height: 100%; background: var(--accent-primary, #bf8942); transition: width 120ms linear; }
</style>
