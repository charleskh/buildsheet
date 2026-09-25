# buildsheet reference

The authoritative description of how this project is put together. `CLAUDE.md`
covers commands and the shape of the thing; this file covers the detail and the
decisions that are easy to undo by accident.

## What it is

A static site generator that runs entirely in a browser. Someone fills in a
build, the browser resizes their photos, and they download a zip containing a
finished website. There is no server, no database, no account and no telemetry.

It exists because a build page should outlive whatever made it. The document
half of SeeTheSpecs (STS) never needed a server, so it is extracted here as
something anyone can run and host for themselves.

## The constraint everything else follows from

**The application ships as one self-contained HTML file that works from
`file://`.** Not as an optimization. It is the product promise: a person who
saves a copy is no longer dependent on this domain, this repository, or anyone
continuing to host anything.

This rules out things that would otherwise be reasonable:

- No router, no server-side rendering, no framework that assumes a server. Plain
  Vite plus Svelte, not SvelteKit.
- No fetching sibling files at runtime. A page opened from `file://` cannot
  fetch its own directory, which is why the generated site inlines its data in a
  `<script type="application/json">` tag instead of loading `build.json`.
- No external stylesheets, fonts, scripts or images. Everything is inlined, and
  CI fails the build if anything creeps back in.

## Layout

```
src/
  lib/
    features/blocks/      schema and video parsing, ported from STS unchanged
    features/builds/      the BuildImage shape the renderers read
    components/blocks/    the eight block renderers, ported from STS unchanged
    components/ui/        CaptionPopover, ported from STS unchanged
    components/editor/    the eight block editors, written for buildsheet
    utils/safeHref.ts     link sanitizing, ported from STS unchanged
    styles/               design tokens, ported from STS unchanged
    images/pipeline.ts    browser-side resizing
    export/               zip writer, zip reader, site generator, self copy
    import/               seethespecs importer, exported-site reloader
    state/                the store and the IndexedDB autosave
  viewer/                 the page a generated site is made of
```

### Why the `$lib` layout mirrors seethespecs

Ported files sit at the same paths they occupy in the STS frontend, so their
imports needed no rewriting and a future re-sync is a plain diff rather than an
archaeology exercise. Do not tidy these paths.

### What was ported and what was not

**Ported unchanged** (1237 lines of renderers plus the schema, tokens and
helpers). They coupled only to `API_BASE_URL`, which is defined here as an empty
string because a generated site serves its own images from its own directory.
Keeping them identical is what guarantees the output looks like STS.

**Written fresh**: the editors. The STS editors are 3676 lines built around
server uploads, image limits and orphan cleanup, none of which exist without a
database. `GalleryBlockEditor` alone is 878 lines of upload batching.

## Content model

Unchanged from STS, at `version: 1`, so a build moves between the two without
translation. Eight block types: `section`, `spec-list`, `bullet-list`, `image`,
`gallery`, `video`, `timeline`, `callout`.

The block table in the STS `AGENTS.md` is stale and omits `video`. Work from
`src/lib/features/blocks/types.ts`, which is authoritative in both projects.

### Image identity without a database

STS blocks reference `BuildImage.id`, a database row id. buildsheet keeps
`imageId: number` and assigns ids locally, with a manifest in the exported site
mapping each id to its files. The block content therefore stays byte-compatible
with STS, and the importer reuses the STS ids directly so nothing has to be
remapped.

### Blocks can reference images that do not exist

They do in real data: STS build 1 lists 104 gallery ids against 65 surviving
image rows. Anything that resolves an id **must** resolve it against the images
actually present and drop the rest. The gallery editor says how many were
dropped, the exporter prunes them, and `tests/import.spec.ts` reproduces the
case.

## The generated site

Built as a second Vite entry (`vite.viewer.config.ts` to `dist-viewer/`), then
inlined into the maker as a string at compile time and filled in at export.

This is why `pnpm build` runs the viewer build first. It also means **the
preview and the published page cannot drift apart**, because they are the same
components rendering the same data.

## Traps that already cost time

**`$state.snapshot` is a compiler rune.** It only exists inside `.svelte` and
`.svelte.ts` modules. In a plain `.ts` file it throws `$state is not defined` at
runtime, which broke both the exporter and the autosave silently. Plain modules
call `snapshot()` exported from `state/build.svelte.ts` instead. Do not reach
for the rune outside a rune-aware module.

**IndexedDB refuses Svelte state proxies.** Structured clone rejects a Proxy, so
anything read out of `$state` has to be snapshotted before being stored. This
failed silently once because the save was wrapped in a bare `catch`. It now
warns on the console, and a test asserts the warning does not appear.

**Storage can be unavailable.** Every IndexedDB and localStorage access is
wrapped, and the application has to work when they fail. A private window is a
normal case, not an error state.

## Testing

- `pnpm test:unit` covers the zip writer, including its CRC against the standard
  check vector, and extracts a real archive with the system `unzip`. A correct
  signature is not proof of a valid archive.
- `pnpm test:e2e` loads the **built** file over `file://` with the network
  blocked. Run `pnpm build` first. This is not incidental: it is the environment
  the product promises works, so it is the one the tests use.
- The round-trip test builds a page, exports it, extracts the zip, opens the
  generated site from disk and asserts that every image actually loaded. It is
  the test that catches whole-pipeline breakage, and it is the one that found the
  rune bug.

## Writing

Plain human voice. No em dashes, no en dashes, no spaced-hyphen asides: rewrite
the sentence instead. Spell out an acronym on first use. Comments explain why,
not what.

The interface is written for someone who has never opened a terminal. Say what
will happen and what they should expect to see. "Your site is live" beats
"deployment succeeded."

## CSS class naming

**Every class this project defines is prefixed `bs-`.** DaisyUI ships component
classes under ordinary English names: `hero`, `card`, `tabs`, `steps`,
`progress`, `collapse`. Svelte's scoped styles add a hash class rather than
removing yours, so a name clash means DaisyUI's rule still applies. `.hero` is
`display: grid` with its children stacked in one cell, which silently put the
build title on top of the cover photo and passed every test that only checked
for text.

The ported seethespecs components are the exception and keep their Tailwind
utility classes. Do not prefix those.

`tests/roundtrip.spec.ts` asserts the outcome rather than the convention: it
measures that the title sits below the cover image and that `.bs-hero` computes
to `display: block`.
