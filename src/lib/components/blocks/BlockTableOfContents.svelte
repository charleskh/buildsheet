<!--
  @component BlockTableOfContents
  Read-only "On this page" navigation for the build detail view. Clicking
  an item scrolls smoothly to the matching block (BlockContentRenderer
  tags each block with `data-block-id`).

  Empty blocks are filtered out so the TOC doesn't surface stubs. This is
  the view-side counterpart of `BlockNavigator` (the editor's reorderable
  page map); the labels and icons are intentionally kept consistent.

  @example
  ```svelte
  <BlockTableOfContents content={build.content} />
  ```
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { BlockContent, ContentBlock, BlockType } from '$lib/features/blocks/types';
  import { parseBlockContent, BLOCK_TYPE_LABELS } from '$lib/features/blocks/types';

  interface Props {
    /** Same shape BlockContentRenderer accepts — JSON string or BlockContent */
    content: string | BlockContent;
    /** Heading shown above the list */
    title?: string;
  }

  let { content, title = 'On this page' }: Props = $props();

  const parsed = $derived(typeof content === 'string' ? parseBlockContent(content) : content);

  const visibleBlocks = $derived(parsed.blocks.filter((b) => !isBlockEmpty(b)));

  /** Block id currently in view — drives the active highlight (scrollspy). */
  let activeId = $state<string | null>(null);

  // Observe the rendered blocks and mark the topmost on-screen one as active.
  // The top rootMargin matches the blocks' `scroll-mt-24` (6rem) so the active
  // item flips as a heading clears the sticky site header; the bottom margin
  // keeps "active" anchored to the upper portion of the viewport.
  onMount(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-block-id]'));
    if (els.length === 0) return;

    const onScreen = new Map<string, boolean>();
    const recompute = () => {
      const first = visibleBlocks.find((b) => onScreen.get(b.id));
      if (first) activeId = first.id;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-block-id');
          if (id) onScreen.set(id, entry.isIntersecting);
        }
        recompute();
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  function isBlockEmpty(block: ContentBlock): boolean {
    switch (block.type) {
      case 'section':
        return !block.header && !block.body;
      case 'spec-list':
        return !block.header && block.items.length === 0;
      case 'bullet-list':
        return !block.header && block.items.length === 0;
      case 'image':
        return block.imageId <= 0;
      case 'gallery':
        return !block.header && block.imageIds.length === 0;
      case 'video':
        return !block.url;
      case 'timeline':
        return !block.header && block.entries.length === 0;
      case 'callout':
        return !block.body;
      default:
        return true;
    }
  }

  function getBlockLabel(block: ContentBlock): string {
    switch (block.type) {
      case 'section':
      case 'spec-list':
      case 'bullet-list':
      case 'timeline':
      case 'gallery':
      case 'video':
        return block.header || BLOCK_TYPE_LABELS[block.type];
      default:
        return BLOCK_TYPE_LABELS[block.type];
    }
  }

  function getBlockIcon(type: BlockType): string {
    switch (type) {
      case 'section':
        return 'M4 6h16M4 12h16M4 18h7';
      case 'spec-list':
        return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
      case 'bullet-list':
        return 'M4 6h16M4 10h16M4 14h16M4 18h16';
      case 'image':
        return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'gallery':
        return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'video':
        return 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'timeline':
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'callout':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M4 6h16M4 12h16M4 18h16';
    }
  }

  function scrollToBlock(id: string) {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    if (el) {
      activeId = id; // reflect the target immediately, before the observer catches up
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

{#if visibleBlocks.length > 0}
  <nav
    class="rounded p-3"
    style="background: var(--surface); border: 1px solid var(--border);"
    aria-label={title}
  >
    <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">{title}</h2>
    <ul class="space-y-1" role="list">
      {#each visibleBlocks as block (block.id)}
        {@const isActive = block.id === activeId}
        <li>
          <button
            type="button"
            class="w-full flex items-center gap-2 py-1.5 pr-1 text-left text-xs truncate transition-colors border-l-2"
            style="border-color: {isActive
              ? 'var(--accent-primary)'
              : 'transparent'}; padding-left: 0.5rem; color: {isActive
              ? 'var(--accent-primary)'
              : 'var(--text-secondary)'}; font-weight: {isActive ? '600' : '400'};"
            aria-current={isActive ? 'true' : undefined}
            onclick={() => scrollToBlock(block.id)}
            title={`Jump to ${getBlockLabel(block)}`}
          >
            <svg
              class="h-3.5 w-3.5 flex-shrink-0"
              style="color: {isActive ? 'var(--accent-primary)' : 'var(--text-muted)'};"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d={getBlockIcon(block.type)}
              />
            </svg>
            <span class="truncate">{getBlockLabel(block)}</span>
          </button>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
