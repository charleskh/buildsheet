<script lang="ts">
  import type { SectionBlock } from '$lib/features/blocks/types';
  import { build } from '$lib/state/build.svelte';
  let { block }: { block: SectionBlock } = $props();
</script>

<label class="form-field">
  <span>Heading</span>
  <input type="text" bind:value={block.header} oninput={() => build.touch()} placeholder="Optional" />
</label>
<label class="form-field">
  <span>Text</span>
  <textarea rows="5" bind:value={block.body} oninput={() => build.touch()}
    placeholder="What happened, what you learned, what you would do differently."></textarea>
</label>
