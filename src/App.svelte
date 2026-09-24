<script lang="ts">
  import { runSelfTest, type SelfTestResult } from './lib/selftest';

  let result = $state<SelfTestResult | null>(null);
  let running = $state(false);

  async function check() {
    running = true;
    result = await runSelfTest();
    running = false;
  }
</script>

<main>
  <h1>buildsheet</h1>
  <p>Phase 0 gate. Proves this page can resize a photo and write an archive with no server.</p>
  <button onclick={check} disabled={running}>{running ? 'Running' : 'Run self test'}</button>
  {#if result}
    <pre data-testid="selftest">{JSON.stringify(result, null, 2)}</pre>
  {/if}
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  pre {
    background: #1e1e1e;
    padding: 1rem;
    overflow-x: auto;
  }
</style>
