<!--
  @component BulletListBlockRenderer
  Read-only display for bullet list blocks.
-->
<script lang="ts">
  import type { BulletListBlock } from '$lib/features/blocks/types';
  import { safeHref } from '$lib/utils/safeHref';

  interface Props {
    block: BulletListBlock;
  }

  let { block }: Props = $props();
</script>

<div class="space-y-3">
  {#if block.header}
    <h3 class="text-lg font-semibold" style="color: var(--text-primary);">
      {block.header}
    </h3>
  {/if}

  {#if block.items.length > 0}
    <ul class="list-disc list-inside space-y-1" style="color: var(--text-secondary);">
      {#each block.items as item}
        {@const href = safeHref(item.link?.url)}
        <li>
          {#if href}
            <a
              {href}
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:no-underline"
              style="color: var(--accent-primary);"
              aria-label={item.link?.label || undefined}
              title={item.link?.label || item.text}
            >
              {item.text}
            </a>
          {:else}
            <span style="color: var(--text-primary);">{item.text}</span>
          {/if}

          {#if item.subItems && item.subItems.length > 0}
            <ul class="list-disc list-inside ml-6 mt-1 space-y-1" style="list-style-type: circle;">
              {#each item.subItems as subItem}
                {@const subHref = safeHref(subItem.link?.url)}
                <li style="color: var(--text-secondary);">
                  {#if subHref}
                    <a
                      href={subHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="underline hover:no-underline"
                      style="color: var(--accent-primary);"
                      aria-label={subItem.link?.label || undefined}
                      title={subItem.link?.label || subItem.text}
                    >
                      {subItem.text}
                    </a>
                  {:else}
                    <span style="color: var(--text-primary);">{subItem.text}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
