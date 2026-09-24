<script lang="ts">
  /**
   * The handoff to Cloudflare.
   *
   * The one hour expiry on a Drop deployment is the thing most likely to make
   * someone think this is broken: they drag the zip, see it work, walk away, and
   * come back to a dead link. So it is stated on screen, twice, and the claim
   * step is a numbered step rather than a footnote.
   */
  import { build } from '$lib/state/build.svelte';
  import { siteZip, singleFileSite, buildSite } from '$lib/export/site';
  import { downloadBlob } from '$lib/export/zip';
  import { makerCopy } from '$lib/export/selfcopy';

  let downloaded = $state(false);
  let working = $state(false);
  let error = $state('');

  const summary = $derived.by(() => {
    try {
      const bundle = buildSite();
      return {
        files: bundle.entries.length,
        megabytes: bundle.totalBytes / 1_000_000,
        photos: bundle.data.images.length,
        dropped: bundle.droppedImageRefs
      };
    } catch {
      return null;
    }
  });

  async function downloadSite() {
    working = true;
    error = '';
    try {
      const { blob, filename } = siteZip();
      downloadBlob(blob, filename);
      downloaded = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    working = false;
  }

  function downloadArchive() {
    const { blob, filename } = singleFileSite();
    downloadBlob(blob, filename);
  }

  function downloadMaker() {
    downloadBlob(makerCopy(), 'buildsheet.html');
  }
</script>

<div class="publish">
  {#if !build.meta.name}
    <p class="field-warning">Give the build a name first. It becomes the page title and the file name.</p>
  {/if}

  {#if summary}
    <p class="summary">
      {summary.photos} photo{summary.photos === 1 ? '' : 's'}, {summary.files} files,
      about {summary.megabytes.toFixed(1)} MB.
      {#if summary.dropped > 0}
        {summary.dropped} photo reference{summary.dropped === 1 ? '' : 's'} point at images that
        are gone and will be left out.
      {/if}
    </p>
    {#if summary.files > 20000}
      <p class="field-warning">
        Over 20,000 files. That is past the free Cloudflare limit, so some photos need removing.
      </p>
    {/if}
  {/if}

  <ol class="steps">
    <li class:done={downloaded}>
      <h3>Download your site</h3>
      <p>A zip with your page, your photos and your text. Nothing is uploaded anywhere.</p>
      <button type="button" class="primary" onclick={downloadSite} disabled={working || !build.meta.name}>
        {working ? 'Packing' : 'Download my site'}
      </button>
      {#if error}<p class="field-warning">{error}</p>{/if}
    </li>

    <li>
      <h3>Drag it onto Cloudflare</h3>
      <p>
        Open <a href="https://cloudflare.com/drop" target="_blank" rel="noreferrer noopener">cloudflare.com/drop</a>
        and drag the zip onto the page. You get a working web address in a few seconds, with no
        signup and nothing to fill in.
      </p>
    </li>

    <li class="warning-step">
      <h3>Claim it within the hour</h3>
      <p>
        <strong>That first address disappears after one hour.</strong> On the Cloudflare page,
        click <strong>Claim</strong>, then create a free account and confirm your email. Once you
        have done that the address is permanent and free.
      </p>
      <p class="field-hint">
        If you close the tab before claiming, nothing is lost. Drag the same zip on again and start
        the hour over.
      </p>
    </li>

    <li>
      <h3>Optional: use your own web address</h3>
      <p>
        In your Cloudflare account you can point a domain you own at the site. Buying the domain
        from Cloudflare itself makes this the shortest version of that job.
      </p>
    </li>
  </ol>

  <section class="extras">
    <h3>Other copies worth having</h3>
    <div class="extra-row">
      <div>
        <strong>A single file copy of the build</strong>
        <p>One HTML file with the photos built into it. Works from a USB stick, offline, forever.</p>
      </div>
      <button type="button" onclick={downloadArchive} disabled={!build.meta.name}>Download</button>
    </div>
    <div class="extra-row">
      <div>
        <strong>A copy of buildsheet itself</strong>
        <p>
          This whole tool is one file. Save it and you can keep making and editing builds even if
          this website disappears.
        </p>
      </div>
      <button type="button" onclick={downloadMaker}>Download</button>
    </div>
  </section>
</div>

<style>
  .publish { display: flex; flex-direction: column; gap: 1.5rem; }
  .summary { color: var(--text-muted, #999); margin: 0; }
  .steps { display: flex; flex-direction: column; gap: 1rem; padding-left: 1.25rem; margin: 0; }
  .steps li { padding-left: 0.25rem; }
  .steps h3 { margin: 0 0 0.25rem; font-size: var(--text-lg, 1.125rem); }
  .steps p { margin: 0 0 0.5rem; }
  .steps li.done h3::after { content: ' ✓'; color: var(--status-success, #16a34a); }
  .warning-step { border-left: 3px solid var(--status-warning, #eab308); padding-left: 0.75rem; margin-left: -0.75rem; }
  .extras { border-top: 1px solid var(--border-muted, #333); padding-top: 1rem; }
  .extra-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0; }
  .extra-row p { margin: 0.15rem 0 0; font-size: var(--text-sm, 0.875rem); color: var(--text-muted, #999); }
</style>
