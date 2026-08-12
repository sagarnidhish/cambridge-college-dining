# Cambridge College Dining Dashboard v2 Design

## Purpose

Expand the existing public Cambridge College Dining Dashboard from Churchill College and St Edmund's College to nine colleges while making the selected-date view more compact and useful. The dashboard must help a Cambridge student answer three separate questions without overstating the available evidence:

1. Which colleges are serving food on the selected date?
2. Which of those colleges are confirmed to admit an unhosted Cambridge student?
3. What time, menu, price, access rule, and special notes have been published?

Version two covers Churchill, St Edmund's, Robinson, Christ's, Clare Hall, Clare, Corpus Christi, Darwin, and Downing. Every displayed fact must retain a visible path back to an official college source or an explicitly labelled supplementary student-body source. Missing information is shown as unknown or not published; it is never silently guessed.

The original two-college release remains available, unchanged, at <https://sagarnidhish.github.io/cambridge-college-dining_old/>. Version two is developed and deployed from the main `cambridge-college-dining` repository.

## Agreed Scope

Version two includes:

- nine college dining cards for a user-selected date;
- a compact summary of colleges confirmed available to an unhosted Cambridge student;
- an embedded Google map and direct Google Maps links;
- meal availability, times, menus, notes, restrictions, official links, and retrieval time;
- access and payment guidance with evidence links;
- indicative prices with audience, precision, source, and as-of date;
- college-specific or University Full Term schedule rules where published;
- a small page-load counter;
- live browser retrieval where the official source supports it;
- scheduled GitHub snapshot collection where browser retrieval is not reliable;
- independent error states and exact-date browser cache fallbacks.

The following ideas are deliberately deferred to later versions:

- a separate cafe and bar guide;
- reviews, Reddit-backed discussion, and review filters;
- Cambridge authentication;
- requests for another student to act as a dining guest host;
- a general-purpose application server or database.

The deferred features may receive reserved navigation or domain boundaries, but version two must not show non-functional controls for them.

## Source Inventory and Retrieval Class

The dashboard uses the user-supplied official pages plus structured representations discovered from those sites. Each adapter owns its source URLs and records both the source publication time, when present, and the time the dashboard retrieved it.

| College | Primary sources | Retrieval class | Menu representation |
| --- | --- | --- | --- |
| Churchill | [Dining page](https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/) and its WordPress REST page | Direct browser fetch | Structured daily items |
| St Edmund's | [Weekly menu archive](https://my.st-edmunds.cam.ac.uk/category/menus/) and [catering timetable](https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/) through WordPress REST | Direct browser fetch | Official lunch and dinner PDFs plus dated exceptions |
| Robinson | [Dated Garden Restaurant menu](https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu?date=2026-08-12) and [food information](https://www.robinson.cam.ac.uk/prospective-students/student-life/food-and-drink) | Scheduled snapshot | Structured daily items and published meal deals |
| Christ's | [Meals page](https://www.christs.cam.ac.uk/student-life/meals) | Scheduled snapshot | Published schedule and explicit current-menu-unavailable state; an official sample menu may be linked but never presented as current |
| Clare Hall | [Dining page](https://www.clarehall.cam.ac.uk/dining/) and the college's published Microsoft Sway menu | Scheduled snapshot with browser rendering for Sway | Structured menu text when confidently extracted, otherwise official menu link |
| Clare | [Dining and catering page](https://www.clare.cam.ac.uk/admissions-outreach/undergraduate-study/life-clare/dining-and-catering) plus an explicitly labelled supplementary student-body source where needed | Scheduled snapshot | Published schedule and current menu link or not-published state |
| Corpus Christi | [Prospective-student food page](https://www.corpus.cam.ac.uk/undergraduate-study/living-corpus/food-and-dining), [current-student food page](https://www.corpus.cam.ac.uk/current-students/food-corpus), and [JCR catering page](https://www.jcr.corpus.cam.ac.uk/catering) | Scheduled snapshot | Official current menu image, linked and displayed without invented OCR text |
| Darwin | [Dining page](https://www.darwin.cam.ac.uk/dine/) and [weekly menu](https://www.darwin.cam.ac.uk/dine/weekly-menu/) through WordPress REST | Direct browser fetch | Structured weekly items, prices, and allergens |
| Downing | [Current-student catering page](https://www.dow.cam.ac.uk/current-students/catering), [accommodation catering page](https://www.dow.cam.ac.uk/undergraduate-study/undergraduate-accommodation/catering), and the official public Kafoodle data feed | Direct browser fetch | Structured daily items, prices, and allergens |

Official college sources have the highest evidence priority. Official student-body sources, such as a JCR or UCS page, may fill a gap only when their status is displayed. Third-party discussion is outside the version-two data path.

## Selected Architecture: GitHub-Only Hybrid

The application remains a static TypeScript and Vite site deployed to GitHub Pages. It has no server, database, paid API, separately hosted proxy, or repository secret.

### Direct sources

On page load and explicit refresh, the browser requests the supported structured endpoints for Churchill, St Edmund's, Darwin, and Downing with browser caching disabled. A source failure affects only that college.

### Scheduled sources

A GitHub Actions collector runs once daily and on manual dispatch for Robinson, Christ's, Clare Hall, Clare, and Corpus Christi. It uses ordinary HTML parsing for server-rendered pages and a headless browser only for the JavaScript-rendered Clare Hall Sway menu.

For Robinson, the collector requests a rolling selected-date window covering the previous seven days through the next forty-two days. Dates outside that menu window still receive recurring schedule, access, location, and price information, but their date-specific menu is explicitly not published in the snapshot. The window may later be enlarged if the request volume remains acceptable.

The collector validates every new college snapshot before it can enter a deployment. If one scheduled source fails, its last successfully deployed record is carried forward with its original retrieval timestamp and a collection warning. A failed or structurally invalid result must never replace the last good snapshot. The collector creates the deployable JSON during the workflow; routine data refreshes do not add automated commits to the main branch.

The production workflow runs the collector, test suite, type check, and build before deploying. A checked-in schema-valid bootstrap snapshot makes the first deployment deterministic. Subsequent workflows can retrieve the last deployed snapshot as their per-source fallback.

### Browser cache

The existing local exact-date cache remains a final fallback for both direct and scheduled sources. A cached result retains its original retrieval time. Cache entries are schema-versioned, validated, and replaced only by a complete normalized result for the same college and date.

## Freshness Semantics

The interface uses three mutually exclusive freshness states:

- **Live**: obtained from an official direct endpoint during the current page load or refresh.
- **Scheduled snapshot**: produced by the GitHub collector and shown with the collector's source retrieval time.
- **Cached fallback**: the browser's last valid result for that exact college and date, used because the current live or snapshot request failed.

The word “live” is never applied to scheduled or retained data. Source modification time and dashboard retrieval time remain separate. A scheduled snapshot that is older than its expected daily collection interval remains usable but receives a visible delayed-update warning.

## Domain Model

`CollegeId` expands to the nine supported colleges. The normalized college-day record continues to contain breakfast, brunch, lunch, and dinner even when the compact view does not render four full panels.

Each normalized record contains:

- college identifier and display name;
- selected ISO date, localized weekday, and `Europe/London` timezone;
- all four normalized meal records;
- location and map information;
- access and payment guidance;
- price quotes;
- applicable term or normal-period rule;
- college-wide and selected-date notices;
- source links and evidence category;
- source modification and retrieval timestamps;
- live, scheduled-snapshot, or cached-fallback freshness.

Each meal record contains:

- meal type;
- availability: `available`, `closed`, or `unknown`;
- serving time or `Time not published`;
- one or more menu representations: structured items, official PDF, official image, official links, or an explicit message;
- meal-specific notes, dietary details, restrictions, and source links.

Access guidance uses a conservative classification:

- `unhosted-cambridge`: an official source confirms that a Cambridge student from another college can attend without a host;
- `guest-required`: the published route depends on a member host or guest arrangement;
- `members-only`: the source explicitly limits the service to members;
- `unknown`: the public evidence does not establish the rule confidently.

The initial evidence classification is:

| College | Initial classification | Dashboard interpretation |
| --- | --- | --- |
| Downing | `unhosted-cambridge` | The published catering information describes charges for students who are not Downing students and permits bank-card payment. |
| Churchill | `guest-required` | Public information describes dining by guests in connection with a College member; it does not establish a general unhosted-student route. |
| Robinson | `guest-required` | Non-Robinson diners are welcomed as guests, with a Robinson member accompanying them to the till. |
| Christ's | `guest-required` | Public regulations describe bona fide guests invited into Upper Hall. |
| Clare Hall | `guest-required` | Guest booking and payment are described through the member host. |
| Darwin | `guest-required` | Published guest dining and payment operate through the Darwin member. |
| St Edmund's | `unknown` | Guests and University-card payment are mentioned, but the public evidence does not confirm an ordinary unhosted route. |
| Clare | `unknown` | The public evidence does not confidently establish outside-college access. |
| Corpus Christi | `unknown` | Guest pricing is published, but the entry or hosting rule is not clear enough to claim unhosted access. |

Consequently, the initial confirmed-unhosted summary may contain only Downing when it has an available meal. This is an access-evidence decision, not a claim that the other colleges are closed. A classification changes only after an evidence fixture, source link, and review are updated together.

Price quotes distinguish exact from approximate values, member from guest or non-member pricing, and current from dated information. Every quote includes an as-of label and source. A missing public price displays `Price not publicly confirmed`.

Term rules distinguish year-round, University Full Term, college normal period, source-specific vacation operation, and unknown. A source-specific college calendar takes precedence over the University calendar.

The menu model supports text items, PDFs, images, links, and messages as first-class content. This prevents Corpus's official menu image or St Edmund's official PDFs from being forced into unreliable text extraction.

## Term-Date Policy

When a college publishes its own normal-period or vacation-service dates, those dates control its schedule. When a college states only “Full Term,” the dashboard uses the University's published Full Term dates. When a source merely says “term time,” the dashboard may derive operation from University Full Term only if the interface labels that derivation.

The University fallback calendar comes from the [official term dates and calendars page](https://www.cam.ac.uk/about-the-university/term-dates-and-calendars). Version two encodes the published Full Terms from 2025–26 through 2028–29:

| Academic year | Michaelmas Full Term | Lent Full Term | Easter Full Term |
| --- | --- | --- | --- |
| 2025–26 | 7 October–5 December 2025 | 20 January–20 March 2026 | 28 April–19 June 2026 |
| 2026–27 | 6 October–4 December 2026 | 19 January–19 March 2027 | 27 April–18 June 2027 |
| 2027–28 | 5 October–3 December 2027 | 18 January–17 March 2028 | 25 April–16 June 2028 |
| 2028–29 | 3 October–1 December 2028 | 16 January–16 March 2029 | 24 April–15 June 2029 |

These Full Term periods must not be confused with the University's longer statutory terms or a college's own normal period of residence. For example, Downing's published normal-period dates take precedence for Downing services that explicitly use that calendar.

No rule is extrapolated beyond the academic years encoded from official sources. If a selected year lacks a supported term calendar, affected term-only meals become unknown with `Term dates not confirmed`; they do not become closed.

Recurring schedules and dated exceptions remain separate. A dated closure or changed serving time overrides the recurring rule. A missing date-specific menu does not change an explicitly scheduled meal to closed.

## Compact User Interface

### Header and date controls

The header retains previous-day, date-picker, next-day, Today, and Refresh controls. It also includes a small page-load counter backed by [hits.sh](https://hits.sh/). The counter requires no account or repository secret, is labelled `Page loads` rather than unique visitors, includes accessible alternative text, and links to its public counter information. Failure to load the third-party counter never affects the dashboard.

### “Where can I eat?” summary

A concise section above the college cards lists colleges that satisfy both conditions for the selected date:

1. at least one meal is explicitly available; and
2. access is classified `unhosted-cambridge`.

The list does not imply that guest-required or access-unknown colleges are closed. If no college qualifies, it says `No college is currently confirmed for unhosted access on this date` and directs the user to the detailed access notes below.

Selecting a listed college updates one embedded Google map. The embed uses a key-free Google Maps place query and has a descriptive iframe title. Each college title separately opens a Google Maps search for the dining hall or nearest named food area. No location is represented as more precise than the published evidence supports.

### College cards

All nine researched colleges remain visible, including colleges excluded from the unhosted summary. Each compact card header shows:

- the college name linked to Google Maps;
- the dining-area name;
- an access badge and short access explanation;
- a concise price summary;
- freshness and last-checked time;
- the selected weekday and date.

Only meals explicitly available on the selected date receive detailed panels. Closed meals collapse into one line, for example `Closed today: Breakfast, brunch`. Unknown meals use a separate line such as `Not confirmed: Dinner` so uncertainty cannot be mistaken for closure.

Breakfast and brunch remain independent in data. Normally, only the available morning service receives a detailed panel and the unavailable one appears in the closed summary. If an official source genuinely publishes both as available, both are shown.

Long structured menus use a short preview with a native expandable details control. The serving status, time, principal menu representation, restrictions, freshness, and verification link remain visible without expansion. Large PDFs are linked rather than embedded as permanently expanded objects. An official menu image may appear as a responsive preview linked to its source.

Notices and restrictions remain mandatory but compact. Each card ends with clearly named links to the official dining, menu, access, or price sources used for that college.

## Adapter and Normalization Boundaries

Each college adapter translates only its own source format into a source-level intermediate record. Shared normalization then applies date, meal, missing-data, provenance, and freshness rules.

Direct adapters must not inject remote HTML into the page. Scheduled parsing treats remote markup as untrusted data. Structured text is escaped by the renderer, links accept only safe HTTP or HTTPS URLs, and image/PDF embeds retain official-source URLs.

The session controller stores colleges in a generic keyed collection rather than hard-coded Churchill and St Edmund's fields. Date selection normalizes all nine colleges independently and derives the unhosted summary from normalized access plus meal availability. A single rejected source cannot prevent the other colleges or map summary from rendering.

## Error and Claim Boundaries

- Network, CORS, HTTP, headless-browser, and parse failures are shown per college.
- A source parser that no longer recognizes the official structure returns unknown or an explicit source error, never a full day of inferred closures.
- A last-good scheduled record keeps its original timestamp and receives a warning after a failed collection.
- A browser cache fallback is visibly stale and cannot overwrite newer deployed data.
- Missing menu content does not alter a confidently published schedule.
- Unknown access excludes a college only from the confirmed-unhosted summary, not from the full dashboard.
- Approximate prices remain labelled approximate and identify their audience and source date.
- Student-body evidence is labelled and never presented as an official college statement.
- The page-load counter counts counter requests or page loads, not people or unique visitors.
- Users can always open the underlying source to verify the dashboard's interpretation.

## Testing Strategy

### Domain and adapter tests

- Fixture parsing for every direct and scheduled college source.
- Date selection, recurring schedules, dated exceptions, closures, menu attachments, dietary notes, prices, and access evidence.
- Sway structure changes fail closed rather than returning invented menu text.
- Corpus official menu images remain valid source links without OCR assumptions.
- Robinson's rolling collection window and outside-window messages.
- All four meals remain in normalized data even when compactly rendered.
- University Full Term and college-specific boundary dates, including unsupported academic years.
- Direct, scheduled-snapshot, delayed-snapshot, and cached-fallback freshness.
- Cache schema migration or safe rejection of version-one entries.

### Session and user-interface tests

- All nine colleges load independently for the selected date.
- The confirmed-unhosted list requires both available service and confirmed unhosted access.
- Guest-required and unknown-access colleges never leak into that list.
- Empty qualifying results use precise, non-closure language.
- Available meals render detail; closed meals render one summary line; unknown meals render a separate line.
- Breakfast and brunch suppression changes presentation only, not the underlying model.
- Date, weekday, time, menu state, notes, freshness, prices, access, and official links remain visible as required.
- Map links are safely encoded; the embed has an accessible title and responds to selection.
- External links use safe new-tab opener isolation.
- Page-load counter failure is non-blocking and has accessible fallback text.
- Desktop, narrow mobile, keyboard, and reduced-motion behavior remain usable.

### Collector, build, and live checks

- Scheduled collector tests use saved fixtures and validate output against the public snapshot schema.
- A failed scheduled source preserves the corresponding last-good record and timestamp.
- A structurally invalid collection cannot be deployed.
- Live smoke checks cover the four direct structured endpoints and the five scheduled source entry points.
- Type checking, automated tests, and the production Vite build pass.
- The built application works at the GitHub Pages project subpath.
- A release audit compares representative current dates with every official source and checks map, access, price, term, and freshness labels.
- The archived version-one repository and Pages URL remain unchanged after the version-two deployment.

## Deployment

The main repository continues to deploy through GitHub Actions to <https://sagarnidhish.github.io/cambridge-college-dining/>. Pushes to `main`, daily collection schedules, and manual workflow dispatch can create a candidate deployment. Only a candidate that passes collection validation, tests, type checking, and build is published.

No new hosting account, server process, API key, or secret is introduced. GitHub's built-in workflow token and Pages artifact flow are sufficient. The README documents the direct-versus-snapshot distinction, source limitations, scheduled collection time, page-load counter behavior, local verification commands, and how to repair a source adapter after official markup changes.

## Acceptance Criteria

Version two is complete only when:

1. The main site displays Churchill, St Edmund's, Robinson, Christ's, Clare Hall, Clare, Corpus Christi, Darwin, and Downing for a selected date.
2. Churchill, St Edmund's, Darwin, and Downing request their supported official structured endpoints on load and refresh.
3. Robinson, Christ's, Clare Hall, Clare, and Corpus Christi use a validated daily GitHub snapshot with a visible retrieval time.
4. Every college card visibly provides date, weekday, meal availability, serving time, menu content or status, notes and restrictions, freshness, access guidance, price status, and source links.
5. Available meals receive compact details, closed meals share one summary line, and unknown meals remain visibly distinct from closed meals.
6. Breakfast and brunch both remain modeled while the compact view normally emphasizes only the available morning service.
7. The “Where can I eat?” section lists only colleges with both an available meal and officially supported unhosted Cambridge-student access.
8. Each college title opens its dining location in Google Maps, and the summary includes one working, accessible embedded map.
9. College-specific dates take precedence over University dates; derived and unsupported term rules are labelled honestly.
10. Prices identify exact versus approximate values, audience, source, and as-of date, or explicitly state that no public price was confirmed.
11. Official PDFs, images, and links remain first-class menu representations without unreliable invented transcription.
12. A failed source leaves the other colleges usable and cannot replace a last-good snapshot or cache entry with invalid data.
13. The page-load counter is non-blocking and is not described as a unique-person count.
14. Automated tests, type checking, production build, live smoke checks, accessibility checks, and a current-source release audit pass.
15. The main GitHub Pages deployment succeeds while <https://sagarnidhish.github.io/cambridge-college-dining_old/> remains available and unchanged.
