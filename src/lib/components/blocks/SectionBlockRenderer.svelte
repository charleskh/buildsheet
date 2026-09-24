<!--
  @component SectionBlockRenderer
  Read-only display for section blocks.
-->
<script lang="ts">
  import type { SectionBlock } from '$lib/features/blocks/types';

  interface Props {
    block: SectionBlock;
  }

  let { block }: Props = $props();
</script>

<div class="space-y-2">
  {#if block.header}
    <h3 class="text-lg font-semibold" style="color: var(--text-primary);">
      {block.header}
    </h3>
  {/if}
  {#if block.body}
    <p class="whitespace-pre-wrap" style="color: var(--text-secondary);">
      {block.body}
    </p>
  {/if}
</div>
