# buildsheet decisions

## 2026-09-24 Phase 0 gate passed

A Svelte 5 application inlined by `vite-plugin-singlefile` into one 34 kB HTML file loads from
`file://`, decodes a photo, resizes it on canvas to the documented tiers, and writes a valid ZIP,
with every non-file request blocked. Proven by `tests/phase0-gate.spec.ts`. The archive is checked
against the system `unzip` in `tests/unit/zip.test.ts` rather than trusting the header signature.

Everything in the permanence plan depended on this, so it was built first and gated everything else.

## 2026-09-24 Store-only ZIP writer instead of a library

Written in-repo at `src/lib/export/zip.ts`, 157 lines, no dependency. Every file buildsheet emits
is either already compressed (JPEG) or tiny (JSON, HTML), so deflate would add code size and CPU
for almost no saving. Fewer dependencies also matters more than usual here, because the whole
product is a file people are meant to keep.

## 2026-09-24 Plain Vite rather than SvelteKit

SvelteKit brings a router, server-side rendering and an adapter layer, all of which fight a
single-file offline build and none of which this application needs. The lifted STS renderers turned
out to import nothing from `$app`, so nothing was lost.

## 2026-09-24 Lift the renderers, rewrite the editors

The STS block renderers (1237 lines) couple only to `API_BASE_URL` in two places, so they port
almost unchanged and guarantee the output looks identical to STS. The STS editors (3676 lines) are
built around server uploads, image limits and orphan cleanup, none of which exist without a
database, so they are rewritten against the same schema instead.
