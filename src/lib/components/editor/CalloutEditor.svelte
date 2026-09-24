<script lang="ts">
  import type { CalloutBlock, CalloutType } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';
  let { block }: { block: CalloutBlock } = $props();
  const kinds: { value: CalloutType; label: string }[] = [
    { value: 'note', label: 'Note' },
    { value: 'tip', label: 'Tip' },
    { value: 'warning', label: 'Warning' }
  ];
</script>

<label class="form-field">
  <span>Kind</span>
  <select bind:value={block.calloutType} onchange={() => build.touch()}>
    {#each kinds as kind (kind.value)}<option value={kind.value}>{kind.label}</option>{/each}
  </select>
</label>
<label class="form-field">
  <span>Text</span>
  <textarea rows="3" bind:value={block.body} oninput={() => build.touch()}
    placeholder="The thing someone would want warned about."></textarea>
</label>
