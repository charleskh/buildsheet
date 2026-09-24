import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// buildsheet ships as ONE self-contained HTML file so it runs from file://
// with no network and no host. See handoffs/buildsheet-design: the whole
// permanence plan depends on this working.
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});
