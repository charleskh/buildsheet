<script lang="ts">
  /**
   * Shared photo intake.
   *
   * Every image in buildsheet comes through here, so this is where the
   * batching, the progress reporting and the per-file error handling live.
   * A phone with several hundred photos is the case this has to survive.
   */
  import {
    processBatch,
    processOne,
    centredCrop,
    COVER_ASPECT,
    type ProgressReport,
    type ProcessedImage
  } from '$lib/images/pipeline';
  import { build } from '$lib/state/build.svelte';

  let {
    multiple = true,
    label = 'Add photos',
    /** Cover photos keep their original bytes so the framing can be changed later,
     *  and start framed to the shape the page renders them at. */
    asCover = false,
    onadded
  }: {
    multiple?: boolean;
    label?: string;
    asCover?: boolean;
    onadded?: (ids: number[]) => void;
  } = $props();

  let input = $state<HTMLInputElement | null>(null);
  let progress = $state<ProgressReport | null>(null);
  let failures = $state<string[]>([]);

  async function handleChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (files.length === 0) return;

    failures = [];
    const startId = build.claimImageIds(files.length);

    let processed: ProcessedImage[];
    if (asCover) {
      progress = { done: 0, total: 1, currentName: files[0].name };
      try {
        const bitmap = await createImageBitmap(files[0], { imageOrientation: 'from-image' });
        const crop = centredCrop(bitmap.width, bitmap.height, COVER_ASPECT);
        bitmap.close();
        processed = [await processOne(files[0], startId, { crop, keepSource: true })];
      } catch (error) {
        failures.push(`${files[0].name}: ${error instanceof Error ? error.message : String(error)}`);
        processed = [];
      }
    } else {
      processed = await processBatch(
        files,
        startId,
        (report) => (progress = report),
        (file, error) => failures.push(`${file.name}: ${error.message}`)
      );
    }

    build.addImages(processed);
    onadded?.(processed.map((p) => p.id));
    progress = null;
    // Reset so picking the same file again still fires a change event.
    target.value = '';
  }
</script>

<div class="picker">
  <input
    bind:this={input}
    type="file"
    accept="image/*"
    {multiple}
    onchange={handleChange}
    hidden
  />
  <button type="button" class="add-row" onclick={() => input?.click()} disabled={progress !== null}>
    {label}
  </button>

  {#if progress}
    <div class="bs-progress" role="status" aria-live="polite">
      <div class="bs-bar"><div class="bs-fill" style="width:{(progress.done / Math.max(1, progress.total)) * 100}%"></div></div>
      <p>Resizing {progress.done + 1} of {progress.total}. {progress.currentName}</p>
      <p class="field-hint">This happens on your computer. Nothing is uploaded.</p>
    </div>
  {/if}

  {#if failures.length}
    <ul class="bs-failures">
      {#each failures as failure (failure)}<li>{failure}</li>{/each}
    </ul>
  {/if}
</div>

<style>
  .bs-progress { margin-top: 0.5rem; }
  .bs-bar { height: 6px; background: var(--surface-sunken, #333); overflow: hidden; }
  .bs-fill { height: 100%; background: var(--accent-primary, #bf8942); transition: width 120ms linear; }
  .bs-failures { color: var(--status-danger, #dc2626); font-size: 0.85rem; margin-top: 0.5rem; padding-left: 1rem; }
</style>
