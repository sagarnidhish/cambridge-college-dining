# Cambridge college dining

A source-linked dining directory for all 31 University of Cambridge colleges. The public landing page is an alphabetical table with date controls, search, evidence filters, sorting, and a shareable detail dialog for each college.

- Current site: <https://sagarnidhish.github.io/cambridge-college-dining/>
- Preserved v1 archive: <https://sagarnidhish.github.io/cambridge-college-dining_old/>
- Sources and methodology: <https://sagarnidhish.github.io/cambridge-college-dining/?view=sources>

The archive is a separate GitHub Pages copy and is not modified by this repository's deployment workflow.

## What the directory shows

For the selected Cambridge date, every college row reports the best public evidence currently available for services, next meal/time, access, indicative price, and freshness. Opening a row shows the weekday and date, meal times, menu material, notices, restrictions, access and guest guidance, payment information, term context, source timestamps, a map, and direct verification links.

Meal availability is deliberately conservative:

- **Available** means dated or clearly applicable official evidence supports service.
- **Closed** means a source explicitly closes that service for the selected date.
- **Unknown** means the public evidence is insufficient. Unknown never silently becomes closed.

The site cannot guarantee admission, price, allergen safety, or last-minute service changes. Users should verify the linked source before travelling and ask catering staff about dietary requirements.

## Source architecture and freshness

Four colleges use structured public browser sources on page load and Refresh:

- Churchill: official WordPress dining page data.
- Darwin: official WordPress menu-publication metadata plus published normal hours. Its public structured endpoint does not expose dish text, so the site links to the official weekly menu instead of inventing items.
- Downing: official public Kafoodle menu data. The feed groups items by weekday but does not separate lunch from dinner; that limitation is displayed.
- St Edmund's: official WordPress weekly menu posts and catering timetable.

The other 27 colleges use the checked-in, schema-validated `public/data/college-dining.json` snapshot. The daily collector validates each primary HTTPS source with ordinary public access, at most two simultaneous requests, a 15-second timeout, no credentials, and no protection bypass. A failed college retains its previous record and timestamp with a warning. A link check alone never promotes a college to menu coverage.

Freshness labels mean:

- **Live**: the direct official source returned and parsed during the current refresh.
- **Scheduled snapshot**: the checked-in daily collection record is being used.
- **Cached fallback**: an earlier successful result for the exact college and date is shown after a current direct request failed.

The browser cache is local to one device. It is versioned, schema-validated, and exact-date only; it is not a shared database or a complete dining history.

Full Term labels are derived from the University's published Full Term calendar. They are context only and do not establish that a servery is open.

## Run locally

Node.js 20.19 or newer is required.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run collect       # refresh public/data/college-dining.json with last-good carry-forward
npm run verify        # typecheck, tests, production build, and built-data validation
npm run smoke:live    # check the four direct sources and a scheduled-link sample
```

To inspect a collection without changing the checked-in file:

```bash
node scripts/collect-dining.mjs \
  --previous public/data/college-dining.json \
  --output /tmp/college-dining.json
```

## Repairing a source

When a college changes its page or payload:

1. Open the college's public official page and identify the most specific current HTTPS dining source.
2. Update `src/domain/catalog.ts`. For a scheduled college, update the matching entry in `scripts/collector/catalog.mjs`; the drift test requires the collector URL to remain in the public catalog.
3. If structured parsing changes, first add a small sanitized fixture and a failing regression test. Preserve the fail-closed rule: unrecognized markup produces Unknown plus a warning, not Closed.
4. Run `npm run collect` to exercise last-good carry-forward, then `npm run verify` and `npm run smoke:live`.
5. Record the result and limitation in `docs/source-audit-2026-08-12.md`.

Do not add credentials, scrape authenticated pages, bypass bot protection, or infer guest access from the mere existence of a public menu.

## Deployment

`.github/workflows/pages.yml` runs on pushes to `main`, manual dispatch, and daily at 05:17 UTC. It installs from the lockfile, collects scheduled links, runs the full verification gate, validates `dist/data/college-dining.json`, and deploys only the `dist` artifact with GitHub Pages' least-privilege permissions. It does not commit collector output back to the repository.

The detailed source and release ledger is in [docs/source-audit-2026-08-12.md](docs/source-audit-2026-08-12.md).
