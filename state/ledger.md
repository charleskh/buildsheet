# buildsheet ledger

Open loops only. Closed items move to `decisions.md`. Keep this an index, not a record.

## In flight

| Item | State |
|------|-------|
| (nothing) | Phases 0 through 6 built and green as of 2026-09-24 |

## Awaiting a decision

| Item | Who |
|------|-----|
| Create `charleskh/buildsheet` as a **public** repository and push | CEO, outward facing |
| Default branch name at publish. Local work is on `work`. | CEO |
| Add the maker's origin to STS `CORS_ALLOWED_ORIGINS` so import works live | CEO, production secret |
| Turn on GitHub Pages, and connect Cloudflare Pages to the same repository | CEO, after the repo exists |
| Point `make.seethespecs.com` at one of the two hosts | CEO |

## Loose ends

- Whether a claimed Cloudflare Drop deployment lands as Pages or Workers, and
  whether the same file limits apply. A five minute test, not a blocker.
- Real device pass on a phone with a few hundred photos. The batching and
  progress reporting are written for that case but have only been exercised
  headless.
- The seethespecs redirect map from `/builds/{id}` to wherever a build moved.
  Lives on the STS side, not here, but it is what keeps printed QR codes working.
