<!--
  @component SpecListBlockRenderer
  Read-only display for spec list blocks.
-->
<script lang="ts">
  import { specListTotal, formatSpecTotal, type SpecListBlock } from '$lib/features/blocks/types';
  import { safeHref } from '$lib/utils/safeHref';

  interface Props {
    block: SpecListBlock;
  }

  let { block }: Props = $props();

  /** Cost/BOM total; null when no item carries a parseable price. */
  const total = $derived(specListTotal(block.items));
</script>

<div class="space-y-3">
  {#if block.header}
    <h3 class="text-lg font-semibold" style="color: var(--text-primary);">
      {block.header}
    </h3>
  {/if}

  {#if block.items.length > 0}
    <dl>
      {#each block.items as item, i}
        {@const href = safeHref(item.link?.url)}
        <div
          class="flex flex-col py-2 sm:flex-row sm:gap-2 sm:items-baseline"
          style={i > 0 ? 'border-top: 1px solid var(--border);' : undefined}
        >
          <dt class="font-bold sm:min-w-32" style="color: var(--text-secondary);">
            {item.key}:
          </dt>
          <dd class="sm:flex-1" style="color: var(--text-primary);">
            {#if href}
              <a
                {href}
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:no-underline"
                style="color: var(--accent-primary);"
                aria-label={item.link?.label || undefined}
                title={item.link?.label || item.value}
              >
                {item.value}
              </a>
            {:else}
              {item.value}
            {/if}
          </dd>
          {#if item.price}
            <span
              class="font-medium whitespace-nowrap sm:text-right"
              style="color: var(--text-primary);"
            >
              {item.price}
            </span>
          {/if}
        </div>
      {/each}
    </dl>

    {#if total}
      <div
        class="flex justify-between gap-2 pt-2 mt-1"
        style="border-top: 1px solid var(--border);"
      >
        <span class="font-semibold" style="color: var(--text-secondary);">Total</span>
        <span class="font-semibold whitespace-nowrap" style="color: var(--text-primary);">
          {total.symbol}{formatSpecTotal(total.sum)}
        </span>
      </div>
    {/if}
  {/if}
</div>
