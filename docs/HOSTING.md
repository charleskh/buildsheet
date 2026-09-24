# Hosting buildsheet

buildsheet is one self-contained HTML file. Hosting it is therefore close to
free everywhere, and the point of publishing it in several places is that no
single one of them has to survive.

## The layers, most durable first

| Layer | Address | Dies when | Cost |
|-------|---------|-----------|------|
| A downloaded copy | wherever they saved it | their drive dies | nothing |
| GitHub Pages | `charleskh.github.io/buildsheet` | GitHub goes away, or the repository is deleted | nothing |
| Cloudflare Pages | a `pages.dev` address | the Cloudflare account closes | nothing |
| Custom domain | `make.seethespecs.com` | the domain stops being renewed | about $10 a year |

The custom domain is a convenience and never a dependency. Every generated site
carries the GitHub Pages address in its footer, so someone holding a build page
years from now can find their way back to the maker without it.

## GitHub Pages

Handled by `.github/workflows/pages.yml` on every push to the default branch.
The repository has to be public for Pages to serve it on a free account, which
it is anyway.

Nothing needs a base path. The built page inlines every asset, so it has no
relative URLs to get wrong when served from a subdirectory.

## Cloudflare Pages

Set up through the Cloudflare dashboard against the same repository, so both
hosts build from one source:

- Build command: `pnpm build`
- Output directory: `dist`
- Node version: 22

## Verifying it stayed self-contained

CI fails the build if `dist/index.html` references anything outside itself. That
check is the whole permanence guarantee in one line: if it passes, a saved copy
works with no network.

To check by hand:

```bash
pnpm build
grep -oE '(src|href)="(https?:)?//[^"]*"' dist/index.html   # expect no output
```
