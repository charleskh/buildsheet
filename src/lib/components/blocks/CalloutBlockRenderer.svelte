<!--
  @component CalloutBlockRenderer
  Read-only display for callout blocks.
-->
<script lang="ts">
  import type { CalloutBlock } from '$lib/features/blocks/types';

  interface Props {
    block: CalloutBlock;
  }

  let { block }: Props = $props();

  const calloutStyles = {
    note: {
      icon: 'ℹ️',
      borderColor: 'var(--status-info)',
      bgColor: 'rgba(37, 99, 235, 0.1)'
    },
    warning: {
      icon: '⚠️',
      borderColor: 'var(--status-warning)',
      bgColor: 'rgba(217, 119, 6, 0.1)'
    },
    tip: {
      icon: '💡',
      borderColor: 'var(--status-success)',
      bgColor: 'rgba(22, 163, 74, 0.1)'
    }
  };

  const style = $derived(calloutStyles[block.calloutType] || calloutStyles.note);
</script>

<div
  class="p-4 rounded-r border-l-4"
  style="
    border-left-color: {style.borderColor};
    background: {style.bgColor};
  "
>
  <div class="flex gap-2">
    <span class="text-lg">{style.icon}</span>
    <p class="whitespace-pre-wrap" style="color: var(--text-primary);">
      {block.body}
    </p>
  </div>
</div>
