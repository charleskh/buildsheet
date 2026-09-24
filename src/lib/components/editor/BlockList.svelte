<script lang="ts">
  import type { BlockType, ContentBlock } from '$lib/features/blocks/types';
  import { LABELS, HINTS, ADD_ORDER } from '$lib/blockLabels';
  import { build } from '$lib/state/build.svelte';
  import SectionEditor from './SectionEditor.svelte';
  import SpecListEditor from './SpecListEditor.svelte';
  import BulletListEditor from './BulletListEditor.svelte';
  import ImageEditor from './ImageEditor.svelte';
  import GalleryEditor from './GalleryEditor.svelte';
  import VideoEditor from './VideoEditor.svelte';
  import TimelineEditor from './TimelineEditor.svelte';
  import CalloutEditor from './CalloutEditor.svelte';

  let collapsed = $state<Record<string, boolean>>({});
  let adding = $state(false);

  function add(type: BlockType) {
    const block = build.addBlock(type);
    adding = false;
    // Scroll the new block into view on the next paint.
    queueMicrotask(() =>
      document.getElementById(`block-${block.id}`)?.scrollIntoView({ block: 'center' })
    );
  }

  function confirmRemove(block: ContentBlock) {
    const owned =
      block.type === 'gallery'
        ? block.imageIds.length
        : block.type === 'image' && block.source === 'block'
          ? 1
          : 0;
    const warning = owned > 0 ? ` This also removes ${owned} photo${owned === 1 ? '' : 's'}.` : '';
    if (confirm(`Remove this ${LABELS[block.type].toLowerCase()} block?${warning}`)) {
      build.removeBlock(block.id);
    }
  }
</script>

<section class="bs-blocks">
  {#each build.blocks as block, i (block.id)}
    <article class="bs-block-card" id="block-{block.id}">
      <header>
        <button
          type="button"
          class="bs-collapse"
          onclick={() => (collapsed[block.id] = !collapsed[block.id])}
          aria-expanded={!collapsed[block.id]}
        >
          {collapsed[block.id] ? '▸' : '▾'} {LABELS[block.type]}
        </button>
        <div class="bs-controls">
          <button type="button" onclick={() => build.moveBlock(block.id, -1)} disabled={i === 0} aria-label="Move block up">↑</button>
          <button type="button" onclick={() => build.moveBlock(block.id, 1)} disabled={i === build.blocks.length - 1} aria-label="Move block down">↓</button>
          <button type="button" class="danger" onclick={() => confirmRemove(block)} aria-label="Remove block">✕</button>
        </div>
      </header>

      {#if !collapsed[block.id]}
        <div class="bs-body">
          {#if block.type === 'section'}<SectionEditor {block} />
          {:else if block.type === 'spec-list'}<SpecListEditor {block} />
          {:else if block.type === 'bullet-list'}<BulletListEditor {block} />
          {:else if block.type === 'image'}<ImageEditor {block} />
          {:else if block.type === 'gallery'}<GalleryEditor {block} />
          {:else if block.type === 'video'}<VideoEditor {block} />
          {:else if block.type === 'timeline'}<TimelineEditor {block} />
          {:else if block.type === 'callout'}<CalloutEditor {block} />
          {/if}
        </div>
      {/if}
    </article>
  {/each}

  {#if build.blocks.length === 0}
    <p class="bs-empty">No sections yet. Add one below to start documenting the build.</p>
  {/if}

  {#if adding}
    <div class="bs-add-menu">
      {#each ADD_ORDER as type (type)}
        <button type="button" onclick={() => add(type)}>
          <strong>{LABELS[type]}</strong>
          <span>{HINTS[type]}</span>
        </button>
      {/each}
      <button type="button" class="bs-cancel" onclick={() => (adding = false)}>Cancel</button>
    </div>
  {:else}
    <button type="button" class="add-block" onclick={() => (adding = true)}>Add a section</button>
  {/if}
</section>

<style>
  .bs-blocks { display: flex; flex-direction: column; gap: 1rem; }
  .bs-block-card { border: 1px solid var(--border, #444); background: var(--surface, #141414); }
  .bs-block-card header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-muted, #333);
  }
  .bs-collapse { background: none; border: 0; color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
  .bs-controls { display: flex; gap: 0.25rem; }
  .bs-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .bs-empty { color: var(--text-muted, #999); }
  .bs-add-menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.5rem; }
  .bs-add-menu button { text-align: left; padding: 0.6rem 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }
  .bs-add-menu span { font-size: 0.8rem; color: var(--text-muted, #999); }
  .bs-add-menu .bs-cancel { grid-column: 1 / -1; text-align: center; }
</style>
