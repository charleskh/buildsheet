<!--
  @component TimelineBlockRenderer
  Read-only display for timeline blocks.

  Mirrors the gallery pattern: each timeline is wrapped in a native
  <details>/<summary> disclosure so a build page with several long timelines
  stays scannable. The <summary> is a header row — title + entry count +
  chevron — and the unchanged vertical timeline lives in the expanded body.
  Native <details> gives keyboard + screen-reader support for free. The first
  timeline on a page opens by default (`isFirstTimeline`); the rest start
  collapsed. A bottom "Collapse" control lets the user close a long timeline
  without scrolling back up to the summary.
-->
<script lang="ts">
  import type { TimelineBlock } from '$lib/features/blocks/types';

  interface Props {
    block: TimelineBlock;
    /**
     * True only for the FIRST timeline block on the page — controls the initial
     * open/closed state of the disclosure. The first timeline renders expanded;
     * subsequent timelines start collapsed. Initial state only; the user can
     * toggle any timeline freely afterwards.
     */
    isFirstTimeline?: boolean;
  }

  let { block, isFirstTimeline = false }: Props = $props();

  // Bound to the <details> element so the bottom "Collapse" button can close it.
  let detailsEl: HTMLDetailsElement | undefined = $state();

  /** Close the disclosure, then scroll its summary/top back into view so the
   *  user lands at the now-collapsed header instead of being stranded mid-page. */
  function collapse() {
    if (!detailsEl) return;
    detailsEl.open = false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detailsEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }
</script>

<details
  bind:this={detailsEl}
  class="timeline-disclosure group/details rounded-lg overflow-hidden transition-shadow hover:shadow-md"
  style="background: var(--surface); border: 1px solid var(--border);"
  open={isFirstTimeline}
>
  <!-- Header ROW of the shared card (no border/rounded of its own — those live
       on the <details> so collapsed + expanded read as one card). The chevron
       rotates via the [open] state on the parent <details> (CSS), suppressed
       under reduced-motion. When open, a bottom divider (see <style>) separates
       this header from the body below. -->
  <summary
    class="timeline-summary list-none cursor-pointer flex items-center gap-3 p-3 pr-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
    style="outline-color: var(--accent-primary);"
  >
    <div class="min-w-0 flex-1">
      <div class="font-semibold truncate" style="color: var(--text-primary);">
        {block.header || 'Timeline'}
      </div>
      <div class="text-sm" style="color: var(--text-muted);">
        {block.entries.length}
        {block.entries.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
    <!-- Chevron: points down when collapsed, up when open. Decorative — the
         expanded/collapsed state is conveyed natively by <details>/<summary>. -->
    <svg
      class="chevron h-5 w-5 flex-none"
      style="color: var(--text-muted);"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </summary>

  <!-- Expanded body: the vertical timeline (unchanged), nested INSIDE the shared
       card. The title isn't repeated here — it already shows in the summary row. -->
  <div class="timeline-body p-3 sm:p-4">
    {#if block.entries.length > 0}
      <div class="relative pl-6 space-y-4">
        <!-- Timeline line -->
        <div
          class="absolute left-2 top-2 bottom-2 w-0.5"
          style="background: var(--border-strong);"
        ></div>

        {#each block.entries as entry}
          <div class="relative">
            <!-- Timeline dot -->
            <div
              class="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2"
              style="background: var(--surface); border-color: var(--accent-primary);"
            ></div>

            <div class="space-y-1">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-medium" style="color: var(--text-muted);">
                  {entry.date}
                </span>
                <span class="font-medium" style="color: var(--text-primary);">
                  {entry.title}
                </span>
              </div>
              {#if entry.description}
                <p class="text-sm" style="color: var(--text-secondary);">
                  {entry.description}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Bottom collapse control: closes this disclosure and scrolls back to its
         header so the user isn't stranded mid-page after collapsing a long
         timeline. Inside <details>, so it only shows when expanded. -->
    <div class="mt-4 pt-3 flex justify-center" style="border-top: 1px solid var(--border);">
      <button type="button" class="btn btn-xs btn-ghost" onclick={collapse}>
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
        Collapse
      </button>
    </div>
  </div>
</details>

<style>
  /* Remove the default disclosure triangle (we render our own chevron). */
  .timeline-summary::-webkit-details-marker {
    display: none;
  }
  .timeline-summary {
    list-style: none;
  }

  /* When expanded, divide the header row from the body below so the two read as
     header→content of one card (the border + rounding live on <details>). */
  details[open] > .timeline-summary {
    border-bottom: 1px solid var(--border);
  }

  /* Chevron points down when collapsed; rotate to point up when open. */
  details[open] .chevron {
    transform: rotate(180deg);
  }
  .chevron {
    transition: transform 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>
