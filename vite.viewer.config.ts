import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/**
 * Builds the page template that generated sites are made from.
 *
 * The maker inlines the output of this build as a string and substitutes the
 * build data into it, which is why the exported site renders with exactly the
 * same components as the preview and cannot drift from it.
 */
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  build: {
    outDir: 'dist-viewer',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: { input: fileURLToPath(new URL('./viewer.html', import.meta.url)) }
  }
});
