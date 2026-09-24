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

## 2026-09-24 Phases 1 through 6 built

The maker takes a build from nothing to a downloadable website entirely in the
browser. Verified by 11 end-to-end tests and 4 unit tests, all loading the built
file over `file://` with the network blocked.

What is proven rather than asserted: a build made in the maker exports to a zip
the system `unzip` accepts, whose extracted site opens from disk with every
image loading; a downloaded site loads back into the maker for editing; work in
progress survives closing the tab; the single file archive opens with its photos
inlined; and the maker saves a copy of itself that is a working application.

## 2026-09-24 The generated site is a second Vite entry, not a hand-written template

The viewer builds from the same renderer components the preview uses and is
inlined into the maker as a string. Writing the output HTML by hand would have
meant two implementations of the same markup drifting apart, and the whole
appeal of the port was that the output looks like seethespecs without anyone
maintaining that resemblance.

## 2026-09-24 Two bugs the round-trip test caught that nothing else would have

`$state.snapshot` is a compiler rune and does nothing in a plain `.ts` module. It
threw at runtime inside a `try`, so the exporter and the autosave both failed
with no visible symptom. Both now call a helper exported from the rune-aware
module.

IndexedDB's structured clone refuses a Proxy, so image records read straight out
of `$state` could never be stored. The bare `catch` around the save hid it. The
save now warns on the console and a test asserts the warning stays absent.

Both were invisible to type checking and to any test that did not exercise the
whole path. That is the argument for keeping the round-trip test first-class.

## 2026-09-24 All project CSS classes are prefixed bs-

DaisyUI occupies ordinary class names (`hero`, `card`, `tabs`, `steps`,
`progress`, `collapse`) and Svelte scoping does not displace them, so `.hero`
quietly became `display: grid` and stacked the build title on top of the cover
photo. Every assertion still passed, because the text was all present and the
images all loaded. Only looking at a screenshot found it.

Prefixing removes the whole category rather than the one instance, which matters
because DaisyUI's component list changes between versions. A layout test now
measures the result, since a convention nobody checks is not a guarantee.
