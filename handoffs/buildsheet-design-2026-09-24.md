# buildsheet

A client-side static site generator that lets anyone build a project page in their browser and
host it themselves, for free, forever. It is how SeeTheSpecs (STS) stops costing money without
ceasing to exist.

Status: design agreed 2026-09-24, nothing built. This document is the kickoff.

## Why this exists

STS will not monetize well enough to justify paying to host it, but the CEO wants the thing to
exist and wants people to keep sharing their builds. Those two goals conflict only if sharing a
build requires a server. It does not. A build is a structured document plus photos, and both are
static files.

So the plan is to split the product. The document half becomes buildsheet, which anyone can run
and host at no cost. The community half (accounts, follows, the cross-user feed, tags across
users, email digests, moderation) is what needs a database and a monthly bill, and it is not
something a non-technical person can self-host under any realistic design. That half winds down.

## Relationship to seethespecs

buildsheet is a **new firm client** with deliberate, documented links back to STS:

- It uses the STS block content schema unchanged, at `version: 1`.
- It lifts the STS renderer components, editor components and design tokens directly.
- It can import an existing STS build by URL while the STS application programming interface
  (API) is still alive.
- Generated sites carry an understated "made with buildsheet" footer, which is how the STS design
  language keeps circulating after the service is gone.

It is a separate repository because it has no backend, no database and no deployment pipeline,
and because it has to outlive STS. It is greenfield and solo, so the `/deliver` worker machinery
buys nothing here.

## The harness

buildsheet gets its own harness on caliban at `~/Development/buildsheet`, structured after the STS
repository and following the apothecarion pattern where the repository is itself the harness.

From STS, the project conventions:

- `AGENTS.md` as the authoritative reference for architecture, the block schema, the design system
  and the when-making-changes checklists, with `CLAUDE.md` covering commands and the big picture
  and pointing at it.
- `docs/` for the style guide and feature documentation.
- `plans/` for design notes on work not yet started.
- `.github/workflows/ci.yml` for lint, type check and tests. There is no deploy workflow, because
  Phase 6 publishes to two static hosts rather than through a pipeline.
- The pre-commit hook running lint-staged on staged files.

From the solo-build clients, the firm-facing surface:

- `state/ledger.md` and `state/decisions.md`, kept lean, which the firm reads read-only for status
  questions. The pull model applies. buildsheet owns its detail and the firm holds a thin gist.
- `handoffs/` for design documents. This file moves there once the harness exists.
- `CHARTER.md` stating what the client is for.

Two things differ from every other firm client. The repository is **public from day one**, because
GitHub Pages needs it and because a permissive license is the real permanence insurance. And there
is no production environment to protect, so the protected-branch rules are the only deployment
safety that applies.

It syncs Mac to caliban through its own `charleskh/buildsheet` remote, pulled at the start of a
session and pushed at the end, and stays outside firm-sync the way datasmith, the-loom and
apothecarion do.

The firm `CLAUDE.md` client table gets a buildsheet row once the directory actually exists, so the
table never points at a path that is not there. That is the first task of Phase 0.

## What the user does

Two paths, same generator. Path A is the one to build first, because it needs no account until
the very end.

### Path A, no account until the site is already live

1. Open the maker.
2. Fill in the build: name, date, description, category, cover photo, then blocks.
3. Preview. It renders exactly as the published page will.
4. Download the zip.
5. Drag the zip onto `cloudflare.com/drop`. The site is live in seconds, no signup.
6. Look at it, share the link, confirm it is right.
7. Click Claim, create a free Cloudflare account, verify the email. Now it is permanent.
8. Optionally add a custom domain.

The deployment at step 5 stays live for **one hour** before it disappears. The maker has to be
loud about this on the screen, not in a readme file. Someone who drags the zip, sees it work, and
then goes to make dinner will come back to a dead link and conclude the whole thing is broken.

### Path B, for people who have a GitHub account

Steps 1 through 3, then a Deploy to Cloudflare button that clones a template repository into
their account and creates a git-backed Workers project that rebuilds itself. Later edits happen
in the browser and the site redeploys on save. Lower priority than Path A.

## Architecture

### One file, no backend

buildsheet is a Svelte application that builds to a **single self-contained HTML file** with the
JavaScript, CSS and fonts inlined. This is the load-bearing decision, and everything about
permanence follows from it.

A single file can be saved to disk and opened from `file://` years later with no network and no
host. The File API for reading photos, canvas for resizing them, and Blob downloads for the zip
all work from a local file. The one thing that does not work from `file://` is fetching sibling
files, which is precisely why the build must inline everything rather than ship a folder.

The maker therefore offers a "download the maker" link. Anyone who clicks it owns a working copy
that survives the loss of the domain, the repository, the hosts and the firm.

### Content model

Unchanged from STS, deliberately, so that import and export are straight copies rather than
translations:

```
BlockContent { version: 1, blocks: ContentBlock[] }
```

All **eight** block types are in scope for v1. The CEO confirmed the full set is wanted, and the
per-block renderers already exist for every one of them:

| Block | Shape |
|---|---|
| `section` | header, body |
| `spec-list` | header, items of key/value with optional link and free-text price |
| `bullet-list` | header, items with optional sub-items and links |
| `image` | imageId, caption, source |
| `gallery` | header, ordered imageIds, optional coverImageId |
| `video` | a pasted YouTube or Vimeo URL, header, caption |
| `timeline` | header, entries of date/title/description |
| `callout` | calloutType of note, warning or tip, plus body |

Note that the block table in the STS `AGENTS.md` is stale and omits `video`. Work from
`web/sts-client/src/lib/features/blocks/types.ts`, which is authoritative.

### Images without a database

This is the only place the schema meets real friction. In STS, `image` and `gallery` blocks
reference `BuildImage.id`, a database row identifier. buildsheet has no database.

The resolution is to keep `imageId: number` in the schema and assign identifiers locally, with a
manifest in the exported site mapping each identifier to its filenames and dimensions. The block
content stays byte-compatible with STS, which keeps import and any future round trip trivial.

The browser pipeline per photo:

1. Read with the File API.
2. Correct orientation from EXIF (exchangeable image file format) data.
3. Emit three sizes, matching the STS tiers: a full view, a roughly 1200 pixel version, and a
   thumbnail.
4. Record width, height and filenames in the manifest.

Process in batches with visible progress. A phone with 400 photos is the case that will fall
over, and a user who thinks the tab has frozen will close it.

### Output shape

The zip contains a complete static site:

```
index.html            the build page
assets/               inlined or hashed styles and scripts
images/               the generated sizes
content/build.json    the block document and metadata
```

Keeping `build.json` in the output is what makes the site reloadable into the maker later. That
is the entire editing story for Path A: load the zip, change it, download it, drag it again.

A second output mode is worth building: a **single self-contained HTML archive** of the build
itself, with images inlined, for people who want a copy on a drive rather than a URL. Downscale
hard for this mode. Build 1 at full size would produce roughly 56 megabytes of base64 in one
file, which browsers handle badly.

## What gets lifted from seethespecs

All of this already runs client-side and needs the API calls removed rather than rewriting:

- `lib/components/blocks/` : `BlockContentRenderer.svelte`, `BlockTableOfContents.svelte` and the
  eight per-block renderer components. This is the HTML rendering.
- `lib/components/editor/` : `BlockEditor.svelte`, `BlockNavigator.svelte`, `SortableList.svelte`
  and the eight per-block editor components.
- `lib/features/blocks/types.ts` : the schema, unchanged.
- `lib/features/blocks/video.ts` : `parseVideoUrl`, which derives embed URLs at render time.
- `lib/styles/design-tokens.css` : the whole visual language.
- `lib/utils/safeHref.ts` : link sanitizing, which matters more in a file people will host
  themselves.

One bonus worth carrying over: `lib/features/blocks/render/` is not the HTML renderer, it is a
separate module that renders blocks to BBCode, Markdown and plain text for pasting into forums.
For an audience that lives on XenForo and vBulletin, "copy this build for a forum post" is a real
feature and it comes almost free.

## Phases

### Phase 0, the gate

Prove a Svelte 5 application builds to one inlined HTML file that runs correctly from `file://`,
including reading a photo, resizing it on canvas, and downloading a zip. Everything in the
permanence plan depends on this working. If it does not, the design changes before any product
work happens, so nothing else starts until this is green.

### Phase 1, the editor

Lift the editor components, strip the API and authentication calls, hold state locally, and
autosave work in progress to IndexedDB so a closed tab does not cost an afternoon.

### Phase 2, the image pipeline

Orientation, resizing, three tiers, the manifest, batching, progress. The hardest engineering in
the project and the most likely to disappoint on a phone.

### Phase 3, the output

The static site template using the renderer components and tokens, the zip writer, and the
reload-a-zip path.

### Phase 4, the Cloudflare handoff

The guided steps after download, with the one hour Drop warning made unmissable, a screenshot of
each screen the person will land on, state that survives a tab switch, and the project name
pre-filled from the build title. A sixty second screen recording will do more here than any
written instruction.

### Phase 5, import from seethespecs

Paste an STS build URL and pull it in. Requires the maker's origin added to
`CORS_ALLOWED_ORIGINS` on the STS API, which is a secret change with no code behind it. Must
resolve gallery image identifiers against `/build/{id}/images` rather than trusting the block
content.

### Phase 6, permanence

Publish to GitHub Pages and Cloudflare Pages from the same repository, add the license, add the
fallback URLs to generated site footers, point `make.seethespecs.com` at one of the two.

## Hosting and permanence

Layered, cheapest and most durable first:

| Layer | Dies when | Cost |
|---|---|---|
| The downloaded single file | their drive dies | nothing |
| `charleskh.github.io/buildsheet` | GitHub goes away or the repo is deleted | nothing |
| A Cloudflare Pages mirror | the Cloudflare account closes | nothing |
| `make.seethespecs.com` | the domain stops being renewed | about $10 a year |

GitHub Pages is the canonical of the two hosts, narrowly, because the repository and the site are
the same artifact and there is no second project to configure or let rot. The custom domain is a
convenience, never a dependency.

Two things that cost nothing and buy real durability: a permissive license (MIT or Apache) so
anyone can rehost it, and the fallback URLs printed in the footer of every generated site so a
person holding a build page in 2031 can find their way back to the maker.

Worth stating plainly, because it is the point of the whole architecture: if `seethespecs.com`
lapses, **the sites people already made are unaffected**. They live in those people's own
Cloudflare accounts.

## The seethespecs side of the work

Three items, none of them large, all of them on the STS repository rather than this one:

1. Add the maker's origin to `CORS_ALLOWED_ORIGINS`. Enables Phase 5. No code change. The image
   content delivery network (CDN) already sends `access-control-allow-origin: *`, so only the API
   needs this.
2. Build a per-user export so people can leave with their data whether or not they ever use
   buildsheet. This makes shutting down non-destructive, which makes every later decision safer.
3. Keep the domain with a static redirect map from `/builds/{id}` to wherever each build moved.
   Build 1's QR codes encode `https://seethespecs.com/builds/1` and those codes are on physical
   objects. This is the cheapest high-value item in the entire plan and it should not be dropped.

## Definition of done for v1

The CEO can take build 1, or a brand new build, from nothing to a live claimed Cloudflare URL
without opening a terminal, and the resulting page is visually indistinguishable from the STS
build page.

## Explicitly out of scope

Accounts, follows, the cross-user feed, cross-user tags and categories, search, moderation, email
digests, analytics, oembed, QR generation. These are the community half and they are not coming
along. If discovery ever matters, the cheap answer is a hand-maintained static directory on one
page linking out to people's sites, not a server.

## Measured facts, build 1

Measured from the live API on 2026-09-24, using the CEO's own build (1978 F150 4x4).

- Block document: 6 kilobytes, 5 blocks (two spec lists, a video, a timeline, a gallery).
- 65 images: 42 megabytes at full size, 6.8 megabytes of thumbnails and 2x thumbnails.
- Whole build under 50 megabytes, roughly 195 files.
- Cloudflare Pages free tier allows 20,000 files per deployment and 25 mebibytes per asset, so
  build 1 uses about one percent of the file budget and nothing approaches the size cap.

Two data hazards found while measuring, both of which the importer must handle:

- The gallery block lists **104 image identifiers but only 65 image rows exist**. The other 39
  resolve to nothing. Block content is not a reliable index of what exists.
- Build 1 uses a `video` block, which the `AGENTS.md` block table omits entirely.

## Open questions

- Does a claimed Cloudflare Drop deployment land as a Pages project or a Workers static assets
  project, and do the same file limits apply? Neither affects build 1, but both want a five
  minute test before this goes in front of users.

Two questions closed on 2026-09-24. The harness is decided and specified above. STS running cost
is explicitly **not a concern right now**, so nothing here is on a deadline and the phases can be
worked at whatever pace suits.
