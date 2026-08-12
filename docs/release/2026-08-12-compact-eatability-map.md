# Compact eatability map release evidence — 12 August 2026

## Release candidate

- Feature commit: `3cabff6762b4dc6a41ec4a25a20f45c0a3c5fa0b`
- Target: <https://sagarnidhish.github.io/cambridge-college-dining/>
- Preserved archive: <https://sagarnidhish.github.io/cambridge-college-dining_old/>
- Archive HTML SHA-256 before publication: `1d0e9f6ba7fdf8de42f452061fd9e57a22d84b3bc13d710841f4566061879f2d`

## Automated gates

- `npm run verify`: passed on the candidate with TypeScript checking, 30 test files / 164 tests, production build, and validation of all 27 scheduled records in the built artifact.
- `git diff --check`: passed.
- Full live collector: all 27 official scheduled-source requests resolved; all five guarded parser structures were recognized.
- `npm run smoke:live`: Churchill, Darwin, Downing, and St Edmund's direct adapters passed. Christ's, Emmanuel, Newnham, and Selwyn scheduled samples passed. Wolfson returned its known intermittent HTTP 403 and remained a review-only warning; no closure was inferred.
- Independent final code review: no actionable Critical, Important, or Minor findings after the term-time applicability and unmatched-fallback regressions were fixed.

## Real-browser audit

Chrome 151 loaded the local production path using the current checked-in public snapshot and live direct adapters.

- Desktop, 1440 × 1000: exactly 31 initial rows, no college errors, full optional table columns, HTTPS Google Maps college links, page-load counter, and a titled Churchill map for 12 August 2026.
- Selected date 7 October 2026: exactly two conservative recommendations, Corpus Christi and Robinson, both in “Host or booking needed”; no unhosted option was asserted.
- Robinson details: selected Wednesday/date, access, payment, term rule, price, freshness, evidence disclosure, and HTTPS verification links were present. The background was inert and the close button received initial focus.
- Closing Robinson details restored focus to the exact map-panel opener (`map-details-robinson`).
- Deep link `?college=churchill`: opened the Churchill dialog and focused its close control.
- Tablet, 720 × 900: all 31 rows remained; optional columns hid.
- Mobile, 320 × 800: all 31 rows remained; optional columns hid; the wide table stayed inside its dedicated horizontal scroller.

## Publication record

- GitHub Actions run [31623113890](https://github.com/sagarnidhish/cambridge-college-dining/actions/runs/31623113890) built and deployed application release commit `e22d32d5c0c52d27896484604e1e61eddac69bad` successfully. Clean install, live collection, full verification, built-data validation, artifact upload, and Pages deployment all passed.
- The deployed public landing page rendered exactly 31 rows, reported “Showing 31 of 31 colleges,” completed loading, showed no college error rows, and exposed the titled Churchill dining map.
- The deployed `?college=churchill` deep link rendered all 31 background rows plus the open Churchill dialog with dining area, access, payment, term rule, indicative price, freshness, evidence disclosure, verification links, and map title.
- Main-site HTML SHA-256 after publication: `ccc9e188ee7a453d271f892d7308891403e234c92fdccb8c1970520ed327ae92`.
- Archive HTML SHA-256 after publication: `1d0e9f6ba7fdf8de42f452061fd9e57a22d84b3bc13d710841f4566061879f2d`, exactly matching the pre-publication hash. No archive repository or deployment setting was changed.
