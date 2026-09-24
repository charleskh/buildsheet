import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// buildsheet ships as ONE self-contained HTML file so it runs from file://
// with no network and no host. See handoffs/buildsheet-design: the whole
// permanence plan depends on this working.
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});
