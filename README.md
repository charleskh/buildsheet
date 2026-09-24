# buildsheet

Make a build page you can host anywhere, for free, forever.

buildsheet runs entirely in your browser. You fill in your build, it resizes your photos, and it
hands you a zip containing a finished website. Drag that zip onto a free host and you have a
permanent URL. Nothing is uploaded to us, because there is no us. There is no server.

## Using it

1. Open the maker.
2. Fill in your build and add your photos.
3. Download the zip.
4. Drag it onto [cloudflare.com/drop](https://cloudflare.com/drop). Your site is live in seconds,
   with no signup.
5. Click Claim to create a free account and keep it permanently.

## It keeps working without us

The maker is one HTML file. Save it to your computer and it still works with no internet
connection. If this repository, the website and the domain all disappear, your saved copy and
every site you made with it carry on.

## Development

```bash
pnpm install
pnpm dev          # local dev server
pnpm build        # single self-contained dist/index.html
pnpm check        # type check
pnpm test:unit    # unit tests
pnpm test:e2e     # end-to-end tests, run against dist/ over file://
```

Run `pnpm build` before `pnpm test:e2e`. The end-to-end tests deliberately load the built file over
`file://` with the network blocked, because that is the environment this project promises works.

## License

MIT. Rehost it, fork it, keep it alive.
