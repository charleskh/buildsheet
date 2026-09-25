# CLAUDE.md

## Read AGENTS.md first

[AGENTS.md](AGENTS.md) is the authoritative reference: architecture, what was
ported from seethespecs and what was not, the content model, and the traps that
have already cost time. This file covers commands and the big picture.

## The one thing to know

buildsheet ships as **one self-contained HTML file that works from `file://`**.
That is the product promise, not an optimization. Anything that adds a network
dependency, a router, a server assumption or an external asset breaks it. CI
fails the build if the output loads anything from the network.

## Commands

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # builds the viewer first, then the maker, into dist/index.html
pnpm check        # svelte-check, must stay at zero errors
pnpm test:unit    # vitest, node environment
pnpm test:e2e     # playwright, loads dist/ over file:// with the network blocked
```

Run `pnpm build` before `pnpm test:e2e`. The end-to-end tests deliberately test
the built artifact rather than a dev server.

## Shape

Two Vite builds. `vite.viewer.config.ts` produces the page a generated site is
made of; `vite.config.ts` produces the maker, which inlines the viewer output as
a template. The preview and the published page therefore render through the same
components and cannot drift apart.

## Branches

The default branch is `main`. Never push to a protected branch without the CEO
saying so explicitly.

## Repository notes

`handoffs/` and `state/` are gitignored on purpose. They hold working records
that are kept privately rather than published. If they ever need to sync between
machines, they want a private repository, not this one.
