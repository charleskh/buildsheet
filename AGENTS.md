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

## Build metadata

Name, one-line description, start date, author, cover photo and links. There are
deliberately **no tags and no categories**: those exist to organise a catalogue
of many builds, and buildsheet makes exactly one page that its owner shares
directly. Nothing browses or searches across builds, so they had no job.

### Links

`BuildMeta.links` is a list of `{ kind, value, label? }`. The value is stored as
the person typed it, bare, and only becomes an href at render time via
`linkHref`. Email is stored without the `mailto:` so the field is easy to fill
in. The viewer runs every href through `safeHref`, which allows only
`http:`, `https:` and `mailto:`, and drops the link entirely otherwise.

### Cover photos are framed, not squeezed

A cover is cropped to `COVER_ASPECT` (16:9) in the editor, and the page renders
it at exactly that shape. Before this, the banner filled itself with whatever it
was given, which on a tall photo took a band out of the middle and looked
mangled.

Cover images are the only ones that keep `sourceBytes`, so the framing can be
changed later without picking the file again. Gallery photos deliberately do not:
holding originals for a hundred of them is how a phone runs out of memory.

## Updating a published build

A published site carries `edit.html`, which is a copy of the maker with
`data-buildsheet-mode="edit-site"` on the body. On load it fetches its own
`content/build.json` and photos from the same origin and opens them in the
editor. So the answer to "how do I update my build" is "go to your own address
and click Edit", not "find the zip from last year".

`edit.html` is produced by `siteEditorHtml()`, which clones the running page.
That means a site always carries the exact version of the maker that built it,
with nothing to keep in sync and nothing to fetch.

**It reads, it never writes.** Anyone can open it, and what they get is a copy in
their own browser. Publishing an update means uploading to hosting, which only
the owner can do. The notice on screen says this plainly and tells a non-owner
they are welcome to use the build as a template, because that is a real and
useful thing to do rather than a loophole to apologise for.

It needs http. A page opened from `file://` cannot fetch a sibling file, and the
error message says so and points at the zip instead.

## Feeds and discovery

Every site publishes `manifest.json` (a small summary), `feed.json` (JSON Feed
1.1) and `rss.xml`, and links the last two from its head.

**Discovery is pull, never push.** A site describes itself; nothing is sent from
the maker and no site ever contacts anyone. Being listed somewhere stays a
deliberate act by the owner. Keep it that way: the privacy claim on the page is
only true while it is.

Timeline entries become feed items, because a timeline is the update log of a
build. A build with no timeline gets one item describing itself.

**Never hand a timeline date to `Date.parse` and trust it.**
`Date.parse("Spring 2019")` returns 1 January 2019 rather than failing, because
the engine ignores the word it does not understand and keeps the year. Publishing
that as a precise date says something the person never did. Dates are matched
against explicit patterns first and left undated otherwise. An undated item is
honest; an invented one is not.

## Saved builds

IndexedDB holds several builds keyed by id, not one draft, so returning to the
maker lists everything made on that machine. `migrateLegacyDraft` moves a record
from the earlier single-draft format, because someone who used the maker before
that change would otherwise open it to an empty list.
