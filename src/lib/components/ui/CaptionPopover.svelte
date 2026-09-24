<!--
  @component CaptionPopover
  A small, dismissible tooltip that shows an image caption inline (a quick
  "peek" without opening the full-screen lightbox). Renders its own speech-bubble
  trigger button; clicking/tapping it toggles the tooltip.

  Used by both the gallery editor tiles and the public gallery tiles so the
  caption-peek interaction is identical across surfaces (the symmetry call).

  Positioning:
  - The tooltip is rendered with `position: fixed` and its coordinates are
    computed from the trigger button's getBoundingClientRect(). Fixed (relative
    to the viewport) means it escapes ALL `overflow-hidden`/stacking ancestors —
    the gallery tile (editor + public) is an `overflow-hidden` card, which would
    otherwise clip an `absolute` popover to a thin sliver.
  - `position: fixed` clips/escapes overflow, but it is STILL painted inside the
    nearest ancestor stacking context (a transformed card, page-transition
    wrapper, etc.). When such an ancestor exists, the tooltip's z-index is scoped
    there and a later-painting sibling tile paints OVER it — z-index alone can't
    fix that. So the tooltip is portalled to <body> (use:portal) so it lives at
    the top of the stacking order; its viewport coordinates stay correct there.
  - It sits adjacent to the icon (below by default, flipped above if it would run
    off the bottom) so it reads as a tooltip and does NOT overlap the image.
  - Clamped to the viewport on BOTH axes so it never spills off any edge (matters
    on narrow mobile grids and at the rightmost column).
  - Recomputed on scroll/resize while open so the fixed tooltip tracks its trigger.

  Accessibility / robustness:
  - Click/tap-triggered (no hover dependency) so it works on touch.
  - Dismisses on outside-click and Escape; Escape returns focus to the trigger.
  - `aria-expanded` / `aria-controls` on the trigger, `role="dialog"` + label on
    the tooltip.

  This is a sibling interactive element — it must NOT be nested inside another
  button (the tile's zoom/lightbox control). Render it as a sibling.
-->
<script lang="ts">
  import { tick } from 'svelte';

  /**
   * Move `node` to <body> on mount and remove it on destroy. This lifts the
   * tooltip out of the gallery tile's stacking context so a later-painting
   * sibling tile can't cover it (the bug `z-index` alone can't fix). The node's
   * `position: fixed` + viewport coordinates stay correct at the body level.
   * The original bind:this reference, the capturing-pointerdown contains() check
   * and the id-based aria link all keep working — only the DOM parent changes.
   */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  interface Props {
    /** Caption text to show. The trigger renders nothing when this is empty. */
    caption: string;
    /** Accessible label for the trigger button. */
    label?: string;
    /** Extra classes for the trigger button (positioning, sizing). */
    triggerClass?: string;
    /** Inline style for the trigger button (e.g. scrim background). */
    triggerStyle?: string;
  }

  let { caption, label = 'Show caption', triggerClass = '', triggerStyle = '' }: Props = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let tooltipEl: HTMLDivElement | undefined = $state();

  // Computed viewport coordinates (px) for the fixed tooltip + which side of the
  // trigger it sits on (so the connecting gap/arrow can flip with it).
  let posTop = $state(0);
  let posLeft = $state(0);
  let placement = $state<'below' | 'above'>('below');

  // Distance between the trigger and the tooltip.
  const GAP = 8;
  // Min margin kept from any viewport edge.
  const MARGIN = 8;

  // Unique id wiring the trigger's aria-controls to the tooltip.
  const popoverId = `caption-popover-${Math.random().toString(36).slice(2, 9)}`;

  async function toggle() {
    open = !open;
    if (open) {
      // Wait for the tooltip to render so we can measure + place it.
      await tick();
      position();
    }
  }

  function close(returnFocus = false) {
    if (!open) return;
    open = false;
    if (returnFocus) triggerEl?.focus();
  }

  /**
   * Place the fixed tooltip adjacent to the trigger, in viewport coordinates.
   * - Default below the trigger; flip above when there isn't room below but there
   *   is above (so it never overlaps the image off-screen).
   * - Horizontally centered on the trigger, then clamped so neither edge spills.
   * - Vertically clamped as a final safety so a tall tooltip on a short viewport
   *   still stays fully on-screen.
   */
  function position() {
    if (!triggerEl || !tooltipEl) return;
    const t = triggerEl.getBoundingClientRect();
    const tip = tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical: prefer below; flip above only if below would clip AND above fits.
    const spaceBelow = vh - t.bottom;
    const spaceAbove = t.top;
    const needed = tip.height + GAP + MARGIN;
    let top: number;
    if (spaceBelow >= needed || spaceBelow >= spaceAbove) {
      placement = 'below';
      top = t.bottom + GAP;
    } else {
      placement = 'above';
      top = t.top - GAP - tip.height;
    }

    // Horizontal: center on the trigger, then clamp to the viewport.
    let left = t.left + t.width / 2 - tip.width / 2;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - MARGIN - tip.width));

    // Vertical clamp (safety for very short viewports / very tall tooltips).
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - MARGIN - tip.height));

    posTop = top;
    posLeft = left;
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.stopPropagation();
      close(true);
    }
  }

  // Keep the fixed tooltip pinned to its trigger as the page scrolls or resizes
  // (a fixed element does NOT move with scroll on its own, so recompute).
  function onWindowReflow() {
    if (open) position();
  }

  // Outside-click / outside-tap dismissal. Uses a capturing pointerdown so it
  // fires before the tile's own handlers; ignores presses on the trigger
  // (toggle handles those) and inside the tooltip.
  function onWindowPointerdown(e: PointerEvent) {
    if (!open) return;
    const target = e.target as Node;
    if (triggerEl?.contains(target) || tooltipEl?.contains(target)) return;
    close(false);
  }
</script>

<svelte:window
  onkeydown={onWindowKeydown}
  onpointerdowncapture={onWindowPointerdown}
  onscroll={onWindowReflow}
  onresize={onWindowReflow}
/>

{#if caption}
  <span class="inline-flex">
    <button
      bind:this={triggerEl}
      type="button"
      class={triggerClass}
      style={triggerStyle}
      onclick={toggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls={popoverId}
      aria-haspopup="dialog"
    >
      <!-- Speech-bubble = caption -->
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.16-3.48A7.93 7.93 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </button>

    {#if open}
      <!-- Fixed (viewport-relative) so it escapes the tile's overflow-hidden card,
           AND portalled to <body> (use:portal) so it escapes any ancestor stacking
           context and paints above adjacent tiles. Coordinates are measured from
           the trigger; data-placement records which side it landed on. z-index is
           inline (1000) since the portalled node is outside this component's tree. -->
      <div
        bind:this={tooltipEl}
        use:portal
        id={popoverId}
        role="dialog"
        aria-label="Image caption"
        data-placement={placement}
        class="fixed w-max max-w-[16rem] rounded px-3 py-2 text-sm leading-snug shadow-lg"
        style={`top: ${posTop}px; left: ${posLeft}px; z-index: 1000; background: var(--surface); color: var(--text-primary); border: 1px solid var(--border);`}
      >
        {caption}
      </div>
    {/if}
  </span>
{/if}
