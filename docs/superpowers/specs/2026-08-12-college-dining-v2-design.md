# Cambridge College Dining Directory v2 Design

## Purpose

Expand the existing public Cambridge College Dining site from two colleges to all 31 colleges in the University of Cambridge's official College A–Z. The public landing page must make comparison quick: it opens directly to a compact table of all colleges for a selected date, and selecting a row opens complete dining details without leaving the table.

The site answers three distinct questions without overstating its evidence:

1. What dining service is published for this college on the selected date?
2. Is an unhosted Cambridge student from another college officially confirmed to be allowed to use it?
3. What times, menus, prices, notes, restrictions, and verification sources are available?

Every college remains visible even when its current menu, access rule, or serving time is not public. Missing information is shown as unknown or not published; it is never silently guessed. The original two-college release remains unchanged at <https://sagarnidhish.github.io/cambridge-college-dining_old/>.

## Scope

Version two includes:

- all 31 Cambridge colleges from the official College A–Z;
- a public landing table shown immediately, with no login;
- selected-date navigation, search, sorting, and evidence-aware filters;
- an accessible detail drawer on desktop and full-screen dialog on mobile;
- direct Google Maps links and one embedded map in the selected-college detail;
- breakfast, brunch, lunch, and dinner availability, time, menu, notes, and restrictions;
- term-date alignment where a service is term-only;
- access, guest, and payment guidance with visible sources;
- indicative prices with exact/approximate, audience, source, and as-of labels;
- live browser retrieval where official endpoints support cross-origin requests;
- daily GitHub Actions snapshots for other public pages, PDFs, images, and JavaScript menus;
- explicit source quality and freshness labels;
- independent errors and exact-date browser cache fallbacks;
- a non-blocking page-load counter;
- a Sources and Methodology page explaining provenance and limitations.

The following remain separate future projects:

- a cafe and bar directory;
- reviews, Reddit-linked discussion, and review filters;
- Cambridge/Raven authentication;
- requests for another student to act as a dining guest host.

No inactive navigation or fake controls for those future projects appear in version two.

## College Inventory and Sources

The canonical inventory is the [University of Cambridge College A–Z](https://www.cam.ac.uk/colleges-and-departments/college-a-z). Official college sources have the highest evidence priority. Official student-body sources may fill a gap only when labelled. A supplementary source is never presented as an official college statement.

| College | Primary dining sources | Initial retrieval level |
| --- | --- | --- |
| Christ's | [Meals](https://www.christs.cam.ac.uk/student-life/meals) | Daily snapshot; recurring schedule and explicit current-menu-unavailable state |
| Churchill | [Dining](https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/) and WordPress REST | Direct live structured menu |
| Clare | [Dining and catering](https://www.clare.cam.ac.uk/admissions-outreach/undergraduate-study/life-clare/dining-and-catering) | Daily snapshot; schedule and official links |
| Clare Hall | [Dining](https://www.clarehall.cam.ac.uk/dining/) and the linked Microsoft Sway menu | Daily headless snapshot; structured menu when extraction is confident |
| Corpus Christi | [Food and dining](https://www.corpus.cam.ac.uk/undergraduate-study/living-corpus/food-and-dining), [Food at Corpus](https://www.corpus.cam.ac.uk/current-students/food-corpus), and [JCR catering](https://www.jcr.corpus.cam.ac.uk/catering) | Daily snapshot; official menu image without invented OCR text |
| Darwin | [Dine](https://www.darwin.cam.ac.uk/dine/) and [weekly menu](https://www.darwin.cam.ac.uk/dine/weekly-menu/) through WordPress REST | Direct live structured menu |
| Downing | [Catering](https://www.dow.cam.ac.uk/current-students/catering), [student catering information](https://www.dow.cam.ac.uk/undergraduate-study/undergraduate-accommodation/catering), and official public Kafoodle data | Direct live structured menu |
| Emmanuel | [Domestic Matters 2025–26](https://apps.emma.cam.ac.uk/college/documents/pdfs/DOMESTIC%20MATTERS%202025-26.pdf) | Daily link/schedule snapshot; dated document label mandatory |
| Fitzwilliam | [Food and drink](https://www.fitz.cam.ac.uk/college-life/food-and-drink) | Daily snapshot; repair warning if official link moves |
| Girton | [Dining and socialising](https://www.girton.cam.ac.uk/dining-and-socialising) | Daily schedule/price snapshot; weekly menu remains internal |
| Gonville & Caius | [Accessibility and catering information](https://www.cai.cam.ac.uk/sites/default/files/accessibility_information.pdf) | Daily link/schedule snapshot; no public current menu initially |
| Homerton | [Catering opening times](https://www.homerton.cam.ac.uk/sites/default/files/Catering%20Opening%20Times%20Term%20Time.pdf) | Daily PDF snapshot; schedule extraction |
| Hughes Hall | [University college profile](https://www.undergraduate.study.cam.ac.uk/colleges/hughes-hall) | Daily University-source snapshot; no college menu initially found |
| Jesus | [Cafeteria](https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria) and [cafeteria lunch menu](https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria-lunch-menu) | Daily link validation; structured collection only when ordinary permitted access is reliable |
| King's | [Undergraduate student handbook](https://www.kings.cam.ac.uk/sites/default/files/documents/intranet/undergraduate-student-handbook-2024-25-final-copy.pdf) | Daily link/schedule snapshot; menus are emailed internally |
| Lucy Cavendish | [College dining overview](https://www.lucy.cam.ac.uk/sites/default/files/inline-files/Welcome%20to%20Lucy%20Cavendish%20College%20and%20College%20Tour%20-%20Webinar%20Series.pdf) and [meal portal](https://services.lucy.cam.ac.uk/meal-epos/) | Daily link/schedule snapshot; portal content is not scraped behind login |
| Magdalene | [Catering](https://www.magd.cam.ac.uk/study-magdalene/undergraduate-study/accommodation-and-food/catering) and [JCR catering](https://www.jcr.magd.cam.ac.uk/catering) | Daily schedule/price snapshot with source-level labels |
| Murray Edwards | [College facilities](https://www.murrayedwards.cam.ac.uk/college-life/college-facilities) | Daily schedule snapshot; current menu link if published |
| Newnham | [Buttery menus](https://newn.cam.ac.uk/weekly-and-daily-menus/) and [Food & Drink](https://newn.cam.ac.uk/student-life/societies-and-facilities/food-drink/) | Daily structured/PDF menu snapshot |
| Pembroke | [Servery menu](https://www.pem.cam.ac.uk/college/catering/information-students/servery-menu) | Daily structured menu snapshot |
| Peterhouse | [Postgraduate handbook](https://www.pet.cam.ac.uk/sites/default/files/inline-files/PG%20handbook%202024_2.pdf) and [Petmenu](https://petmenu.co.uk/) | Official schedule plus clearly labelled supplementary menu; never claim Petmenu is official |
| Queens' | [Dining Hall](https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/) and [weekly menu](https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/weekly-menu/) | Daily structured menu/schedule snapshot |
| Robinson | [Dated Garden Restaurant menu](https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu?date=2026-08-12) and [food and drink](https://www.robinson.cam.ac.uk/prospective-students/student-life/food-and-drink) | Daily rolling date-window snapshot |
| Selwyn | [Hall menu](https://augbeta.sel.cam.ac.uk/current-members/hall-menu) | Daily dated-menu snapshot from an official college subdomain |
| Sidney Sussex | [Students' Union Hall guide](https://sscsu.org.uk/hall) and official College documents | Daily student-body snapshot with evidence label |
| St Catharine's | [MCR Hall times](https://mcr.caths.cam.ac.uk/current-students/hall-times) and official College documents | Daily student-body schedule snapshot with evidence label |
| St Edmund's | [Menu archive](https://my.st-edmunds.cam.ac.uk/category/menus/) and [catering timetable](https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/) through WordPress REST | Direct live schedule, PDF menu, and exception data |
| St John's | [Food & Drink](https://www.joh.cam.ac.uk/live-and-study/food-and-drink) | Daily schedule snapshot; current menu link when published |
| Trinity | [Student experience and catering](https://www.trin.cam.ac.uk/access/outreach-home/student-experiences-at-trinity/) and current College regulations | Daily schedule/link snapshot; no public current menu initially |
| Trinity Hall | [Food and Drink](https://www.trinhall.cam.ac.uk/study-with-us/life-trinity-hall/food-and-drink/) | Daily schedule snapshot; daily menus remain internal |
| Wolfson | [Food & Dining](https://www.wolfson.cam.ac.uk/college-life/food) and [Buttery menus](https://www.wolfson.cam.ac.uk/food/cafeteria-menus) | Daily structured menu, price, allergen, and schedule snapshot |

Each adapter records every source URL, evidence category, source publication time when present, and dashboard retrieval time. Dated handbooks and sample menus retain their dates and are never presented as current weekly menus.

## Architecture: GitHub-Only Hybrid

The application remains a static TypeScript/Vite site on GitHub Pages. It has no application server, database, paid map API, separately hosted proxy, repository secret, or user authentication.

### Direct sources

On load and explicit Refresh, the browser requests supported structured endpoints for Churchill, St Edmund's, Darwin, and Downing with browser caching disabled. These results are eligible for the `Live` freshness label. A direct-source failure affects only that college.

### Scheduled collector

A GitHub Actions collector runs daily and on manual dispatch for the other 27 colleges. It uses ordinary HTTP and HTML/PDF parsing first and may use a headless browser only for a JavaScript-only source whose normal public access permits automation. It does not bypass authentication, CAPTCHAs, rate limits, or anti-bot controls; a blocked source remains link-only.

The collector supports three outcomes per college:

- `menu`: validated dated menu plus schedule/profile data;
- `schedule`: validated schedule, price, access, or restrictions with an explicit menu-not-public state;
- `link-only`: a validated source link and explicit unknown fields when no safe parser exists.

Robinson and other date-query sources use a rolling window from seven days before collection through 42 days after it. Outside the window, recurring information remains visible and the date-specific menu is explicitly not in the snapshot.

Every new college record is schema-validated before deployment. If collection fails, the last successfully deployed record is carried forward with its original timestamp and a warning. Invalid or empty parsing cannot replace good data. Routine refreshes create the deployable JSON inside the workflow and do not add bot commits to `main`.

### Browser cache

The browser stores the last complete normalized result for each exact college/date pair. It is used only after the current direct or scheduled result fails and is always labelled `Cached fallback` with its original time. Version-one cache entries are rejected or migrated only through explicit schema validation.

## Freshness and Evidence

Freshness values are mutually exclusive:

- `Live`: obtained from an official direct endpoint in the current browser refresh;
- `Scheduled snapshot`: produced by the GitHub collector and displayed with collection time;
- `Cached fallback`: exact-date browser data retained after a current failure.

An overdue scheduled snapshot receives a delayed-update warning but is not relabelled live. Source modification and dashboard retrieval times remain separate.

Source evidence is one of:

- `Official college`;
- `Official University`;
- `Official student body`;
- `Supplementary, not official`.

The detail view shows those labels beside the relevant links. Supplementary evidence cannot establish unhosted access or override contradictory official information.

## Domain Model

`CollegeId` contains exactly the 31 College A–Z entries. A normalized `DiningDay` always contains breakfast, brunch, lunch, and dinner even though the compact table does not show four panels.

Each college-day record contains:

- college identifier and display name;
- selected ISO date, weekday, and `Europe/London` timezone;
- four meal records;
- location and map query;
- access, guest, and payment guidance;
- price quotes;
- applicable term/normal-period rule;
- college-wide and selected-date notices;
- evidence-labelled source links;
- source modification and retrieval timestamps;
- freshness and optional collection warning.

Each meal record contains:

- meal type;
- availability: `available`, `closed`, or `unknown`;
- serving time or `Time not published`;
- zero or more structured items, official PDFs, official images, links, or explicit messages;
- notes, dietary information, restrictions, and source links.

Access classifications are:

- `unhosted-cambridge`: an official source confirms access for a Cambridge student from another college without a host;
- `guest-required`: published access depends on a member host or guest arrangement;
- `members-only`: the source explicitly limits the service to members;
- `unknown`: public evidence does not establish the rule confidently.

Downing is initially the only college eligible for `unhosted-cambridge`. All other colleges remain guest-required, members-only, or unknown until official evidence proves otherwise. The top-level filter is an access-evidence statement, not a claim that excluded colleges are closed.

Prices distinguish exact from approximate, the applicable audience, the source, and an as-of date. Missing public prices display `Price not publicly confirmed`.

## Term-Date Policy

College-specific normal-period or vacation dates take precedence. If a source says `Full Term`, the dashboard uses the [official University term dates](https://www.cam.ac.uk/about-the-university/term-dates-and-calendars). If a source merely says `term time`, University Full Term may be used only with a visible derived-rule label.

Version two encodes published Full Terms for academic years 2025–26 through 2028–29. It does not confuse Full Term with the longer statutory University term. Unsupported academic years produce `Term dates not confirmed`, not closure.

Dated closures or changed times override recurring schedules. A missing current menu does not alter an explicitly published schedule to closed.

## Landing Table

The public root page opens immediately to an alphabetical table of all 31 colleges. No authentication interstitial appears.

Above the table are:

- previous day, date picker, next day, and Today controls;
- text search by college or dining-area name;
- filters for `Serving today`, `Confirmed without a host`, `Menu published`, and `Access unknown`;
- sortable column headers;
- explicit Refresh;
- a page-load counter labelled as page loads, not unique people.

Desktop columns are:

`College | Services today | Next meal/time | Access | Indicative price | Freshness`

The initial order is alphabetical so all 31 entries are predictable. Sorting or filtering never changes the selected date. On narrow screens the table retains `College`, `Services today`, and `Access`; the other values remain available in the detail dialog. Empty results explain which filters are active and provide a Clear filters action.

Rows are keyboard-focusable controls with an accessible name that includes college and selected date. Loading, error, and stale states remain readable without relying on colour.

## College Detail Pop-out

Selecting a row opens a right-side drawer on desktop and a full-screen modal dialog on narrow screens. It is not a separate browser window. The selected college is encoded as `?college=<id>`, enabling bookmarks, shared links, reload restoration, and browser Back/Forward navigation.

The detail contains:

- college title linked to its Google Maps dining-area search;
- dining-area name and embedded key-free Google map with an accessible title;
- selected weekday and date;
- access badge, explanation, guest rules, and payment notes;
- indicative prices and as-of/source labels;
- freshness, last checked time, source modification time, and warnings;
- detailed sections only for available meals;
- one compact line such as `Closed today: Breakfast, brunch`;
- a separate line such as `Not confirmed: Dinner`;
- meal time, menu content/status, dietary notes, restrictions, and evidence links;
- college-wide and dated notices;
- a final Sources section containing every verification link.

Breakfast and brunch remain separate in data. Normally only the available morning service receives detail. If both are officially available, both render.

Long menus use a short preview and native expandable details. PDFs are linked rather than permanently embedded. Official menu images may appear as responsive previews linked to the original. Remote source HTML is never injected.

The dialog has an explicit close button, closes on Escape, restores focus to the originating row, traps focus while open, labels its title, and prevents background interaction. Closing it removes only the `college` query parameter and preserves selected date and filters.

## Secondary Page

A Sources and Methodology page lists all 31 source groups, evidence labels, last successful collection times, and freshness definitions. It also explains that access and prices can change, scheduled sources are not live, supplementary links are not official, and users should verify important restrictions at the source.

The main table and detail view remain the primary workflow. Future cafe/bar, review, login, and guest-request projects gain their own routes only when they contain functional features.

## Error and Claim Boundaries

- One failed college never prevents the other 30 rows from rendering.
- Parser drift returns unknown or a source error, never a fabricated day of closures.
- Missing menu content does not change a confidently scheduled meal to closed.
- Unknown access excludes a college only from the confirmed-unhosted filter.
- Last-good snapshots retain their original timestamps after collection failure.
- Exact-date cache fallbacks never overwrite newer live or scheduled results.
- Dated or sample material is visibly dated and cannot appear as a current menu.
- Petmenu is visibly supplementary and cannot establish official access, prices, or restrictions.
- Page-load counting is non-blocking and is not described as unique visitors.
- External content is parsed as untrusted data and safe URLs are restricted to HTTPS.
- Users can always open the underlying source to verify the interpretation.

## Testing

### Domain and adapters

- Exactly 31 canonical IDs, names, locations, and source groups.
- Every normalized day retains all four meal records.
- Direct adapter fixtures for Churchill, St Edmund's, Darwin, and Downing.
- Scheduled parser fixtures for every source promoted beyond link-only.
- Link-only profiles produce explicit unknowns and never fake current menus.
- HTML, PDF, image, Sway, and supplementary menu representations retain evidence labels.
- Full Term and college-specific boundary tests, including unsupported years.
- Access classification and price provenance validation.
- Snapshot schema rejection and per-college last-good carry-forward.
- Version-two exact-date cache validation and stale semantics.

### Landing table and dialog

- All 31 rows render alphabetically on initial load.
- Search, filters, sort, empty results, and Clear filters work together.
- `Serving today` requires explicit availability; unknown is not serving.
- `Confirmed without a host` requires official unhosted evidence.
- Responsive column hiding does not remove detail data.
- Row click and keyboard activation open the correct college.
- Query-parameter deep links, reload, Back/Forward, close, Escape, focus trap, and focus restoration work.
- Available details, closed summary, unknown summary, breakfast/brunch presentation, maps, prices, access, notes, freshness, and sources render correctly.
- Unsafe URLs and source HTML do not become executable content.
- Counter failure does not affect the table.

### Collector, build, and release

- Daily collector validates every one of the 27 scheduled college records.
- Failed source collection preserves last-good data and timestamp.
- Direct endpoint and scheduled entry-point live smoke checks run with polite request volume.
- Type checking, full tests, production build, and GitHub Pages subpath checks pass.
- Desktop and mobile table/dialog behavior is inspected with keyboard and reduced motion.
- Representative current dates are compared to all 31 source groups before release.
- The archive URL remains available and unchanged.

## Deployment

The main repository deploys to <https://sagarnidhish.github.io/cambridge-college-dining/> through GitHub Actions on pushes to `main`, the daily schedule, and manual dispatch. Only schema-valid collection output with passing tests, type checking, and build can be published.

The collector first attempts current sources, then carries forward each failed college from the last deployed snapshot. A schema-valid checked-in bootstrap supports the first all-college deployment. No new hosting account, paid service, API key, or secret is introduced.

The page-load counter uses [hits.sh](https://hits.sh/) and is isolated from application state. Google Maps uses key-free search and embed URLs.

## Acceptance Criteria

Version two is complete only when:

1. The public root page immediately shows an alphabetical table of exactly 31 Cambridge colleges without login.
2. The selected date, search, sorting, and four evidence-aware filters operate without removing underlying data.
3. Every row shows college, services today, next meal/time, access, indicative price, and freshness on desktop, with the documented responsive subset on mobile.
4. Selecting any row opens the correct accessible drawer/dialog and a shareable `college` query parameter.
5. Every detail view provides selected weekday/date, all meal availability, time, menu status/content, notes/restrictions, access, prices, freshness, map, and verification links.
6. Available meals receive detail, closed meals share one summary line, and unknown meals remain distinct.
7. Breakfast and brunch remain modeled independently while the compact view emphasizes the available service.
8. Churchill, St Edmund's, Darwin, and Downing refresh their official structured endpoints in the browser.
9. The other 27 colleges load validated daily snapshots at menu, schedule, or link-only evidence level.
10. No dated handbook, sample menu, student-body page, or supplementary source is misrepresented as a current official menu.
11. College-specific periods take precedence; derived and unsupported term rules are labelled.
12. Access and prices retain evidence, audience, and as-of labels; only officially confirmed unhosted access enters that filter.
13. A failed source leaves the other 30 usable and cannot replace valid last-good data.
14. The Sources and Methodology page explains all source groups and freshness limitations.
15. Automated tests, type checking, build, live smoke checks, accessibility inspection, and the 31-source release audit pass.
16. The main GitHub Pages deployment succeeds while <https://sagarnidhish.github.io/cambridge-college-dining_old/> remains unchanged and available.
