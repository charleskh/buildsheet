# buildsheet charter

## What this is for

Anyone can document a build and put it on the internet, for free, without a developer, an account
they have to keep, or a service that can be switched off. buildsheet makes the page. The person
hosts it themselves.

## Why it exists

SeeTheSpecs (STS) proved the format works but will not earn enough to justify paying to host it.
The build documents and the community around them are separable. This is the half that does not
need a server, extracted so it can outlive the half that does.

## What success looks like

Someone who has never opened a terminal takes photos and notes about their project, and ends up
with a permanent URL they control. If buildsheet, the firm and the domain all disappear the next
day, that URL still works and they can still edit it.

## What this is not

Not a service. Not a platform. There are no accounts, no database, no feed, no moderation, and
nothing to sign up for. If a feature needs a server to run, it belongs in STS, not here.

## Constraints that do not bend

- The application ships as one self-contained HTML file that works from `file://`.
- No telemetry, no analytics, no outbound calls the user did not ask for.
- A permissive license, so anyone can rehost it if this repository goes away.
- Generated sites never depend on buildsheet being online.
