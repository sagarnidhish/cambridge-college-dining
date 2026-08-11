# Cambridge college dining

A small, browser-only dashboard for checking lunch and dinner information for
two Cambridge colleges: Churchill College and St Edmund's College. It gives a
single date-selected view while keeping the colleges' own pages as the
authoritative sources.

## Official sources

The dashboard reads these official WordPress REST endpoints on load and when
the user selects **Refresh**:

- [Churchill lunch and dinner menu](https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/) — [REST endpoint](https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305?_fields=id,modified,link,title,content)
- [St Edmund's menus](https://my.st-edmunds.cam.ac.uk/category/menus/) — [REST endpoint](https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69&per_page=10&_fields=id,date,modified,link,title,content)
- [St Edmund's catering information](https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/) — [REST endpoint](https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18?_fields=id,modified,link,title,content)

It is intentionally limited to those two colleges. The college sites and their
CDNs control cache headers and source publication timing, so a successful
refresh means the latest response then available through those sources, not a
guarantee that a college has published a new menu.

## Availability and menus

Each meal is shown as one of:

- **Available** — the official source publishes service for that meal and date.
- **Closed** — the official source explicitly says that service is unavailable.
- **Unknown** — the source does not publish enough information to determine the
  meal's availability for that date; it is not treated as closed.

Churchill menu text is displayed when it is published in the source page. St
Edmund's publishes its weekly menus as PDFs, so the dashboard embeds each
official PDF where the browser permits and always provides the official PDF
link. That preserves the source rather than attempting to transcribe or infer
menu items.

## Run locally

```bash
npm install
npm run dev
npm run verify
npm run smoke:live
```

`npm run verify` performs type checking, unit tests, and a production build.
`npm run smoke:live` makes live requests to all three official REST endpoints;
it requires a successful HTTP response, JSON content type, matching CORS
permission, and the expected official payload shapes.

## Resilience and limits

The app keeps the most recent successful date-and-college result in browser
local storage. If a later live request fails, that cached result is labelled
**Cached result (stale data)** with its last-checked time. If no suitable cached
result exists, the source is shown as unavailable and the official link remains
available. Local storage is per browser and device and is not a shared cache.

This is a static client application: it has no application server, database, or
historical dining-data store. It does not claim to retain a complete history or
to know values a college has not published.

## Deployment

The Pages workflow runs on pushes to `main` (and can be run manually). It uses
`npm ci`, type checks, tests, builds the Vite site, and publishes the Pages
artifact from `dist` using a repository-relative production output. The live
smoke command is intentionally a release/manual check rather than a deployment
job: a temporary college outage must not prevent publication of an otherwise
valid static site that has stale-cache support.

College page markup and WordPress payloads can change without notice. Fixtures
and unit tests catch known parsing expectations, while `npm run smoke:live`
checks the current official endpoint status, CORS, content type, and basic
payload structure. A smoke failure signals that the source adapter may have
drifted and should be investigated against the official pages before a release.
