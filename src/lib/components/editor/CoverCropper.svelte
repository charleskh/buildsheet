<script lang="ts">
  /**
   * Frame the cover photo.
   *
   * Without this the page fills a wide banner with whatever it was given, which
   * takes a band out of the middle of a tall photo and looks wrong. The output
   * is the same shape the page renders at, so once framed here the photo is
   * never cropped a second time.
   */
  import { COVER_ASPECT, centredCrop, type CropRect } from '$lib/images/pipeline';

  let {
    source,
    initialCrop,
    oncancel,
    onconfirm
  }: {
    /** Bytes of the original photo, so framing can be changed without re-picking. */
    source: Uint8Array;
    initialCrop?: CropRect;
    oncancel: () => void;
    onconfirm: (crop: CropRect) => void;
  } = $props();

  let objectUrl = $state('');
  let natural = $state({ width: 0, height: 0 });
  let stageWidth = $state(0);

  /** Zoom of 1 means the crop box is as large as it can be on the short axis. */
  let zoom = $state(1);
  /** Crop centre, in source pixels. */
  let centre = $state({ x: 0, y: 0 });
  let dragging = $state(false);
  let last = { x: 0, y: 0 };

  $effect(() => {
    const url = URL.createObjectURL(new Blob([source as unknown as BlobPart], { type: 'image/jpeg' }));
    objectUrl = url;
    const img = new Image();
    img.onload = () => {
      natural = { width: img.naturalWidth, height: img.naturalHeight };
      const base = initialCrop ?? centredCrop(img.naturalWidth, img.naturalHeight, COVER_ASPECT);
      const maxBase = centredCrop(img.naturalWidth, img.naturalHeight, COVER_ASPECT);
      zoom = maxBase.width / base.width;
      centre = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  });

  /** The crop rectangle implied by the current zoom and centre, kept in bounds. */
  const crop = $derived.by<CropRect>(() => {
    if (!natural.width) return { x: 0, y: 0, width: 1, height: 1 };
    const max = centredCrop(natural.width, natural.height, COVER_ASPECT);
    const width = Math.max(64, Math.round(max.width / zoom));
    const height = Math.round(width / COVER_ASPECT);
    const x = Math.round(Math.min(Math.max(centre.x - width / 2, 0), natural.width - width));
    const y = Math.round(Math.min(Math.max(centre.y - height / 2, 0), natural.height - height));
    return { x, y, width, height };
  });

  /** Scale from source pixels to the pixels shown on screen. */
  const scale = $derived(stageWidth && crop.width ? stageWidth / crop.width : 1);

  function down(event: PointerEvent) {
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!dragging) return;
    centre = {
      x: centre.x - (event.clientX - last.x) / scale,
      y: centre.y - (event.clientY - last.y) / scale
    };
    last = { x: event.clientX, y: event.clientY };
  }
  function up(event: PointerEvent) {
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }
  function recentre() {
    zoom = 1;
    centre = { x: natural.width / 2, y: natural.height / 2 };
  }
</script>

<div class="bs-cropper" role="dialog" aria-label="Frame your cover photo" aria-modal="true">
  <div class="bs-cropper-panel">
    <h2>Frame your cover photo</h2>
    <p class="field-hint">
      Drag the photo to move it and use the slider to zoom. What you see here is exactly what the
      top of your page will show.
    </p>

    <div
      class="bs-stage"
      bind:clientWidth={stageWidth}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      style="aspect-ratio: {COVER_ASPECT};"
    >
      {#if objectUrl && natural.width}
        <img
          src={objectUrl}
          alt=""
          draggable="false"
          style="
            width: {natural.width * scale}px;
            height: {natural.height * scale}px;
            left: {-crop.x * scale}px;
            top: {-crop.y * scale}px;
          "
        />
      {/if}
    </div>

    <label class="form-field">
      <span>Zoom</span>
      <input type="range" min="1" max="4" step="0.01" bind:value={zoom} />
    </label>

    <div class="bs-cropper-actions">
      <button type="button" onclick={recentre}>Reset</button>
      <span class="bs-spacer"></span>
      <button type="button" onclick={oncancel}>Cancel</button>
      <button type="button" class="primary" onclick={() => onconfirm(crop)}>Use this framing</button>
    </div>
  </div>
</div>

<style>
  .bs-cropper {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .bs-cropper-panel {
    background: var(--surface, #141414);
    border: 1px solid var(--border, #444);
    padding: 1rem;
    width: min(44rem, 100%);
    max-height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .bs-cropper-panel h2 {
    font-family: var(--font-family-heading, inherit);
    margin: 0;
    font-size: var(--text-xl, 1.25rem);
  }
  .bs-stage {
    position: relative;
    overflow: hidden;
    background: var(--surface-sunken, #0a0a0a);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .bs-stage:active {
    cursor: grabbing;
  }
  .bs-stage img {
    position: absolute;
    max-width: none;
    pointer-events: none;
  }
  .bs-cropper-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .bs-spacer {
    flex: 1;
  }
</style>
