# College dining source audit — 12 August 2026

## Release result

The directory contains exactly 31 canonical Cambridge colleges in alphabetical order. Four direct adapters passed current structural and CORS smoke checks on 12 August 2026. A full bounded scheduled-source collection resolved all 27 primary links after stale URLs were replaced; a later five-link smoke sample saw an intermittent HTTP 403 from Wolfson, which is treated as a review warning and not as evidence that dining is closed.

Evidence and claims remain intentionally separate. “Official University” is used when no suitable current college dining page was found. “Official student body” is visibly labelled. “Supplementary” is never presented as official. A successful link check establishes only that the source resolved; it does not establish current meal availability.

## Source ledger

| College | Primary public source | Evidence | Retrieval | Last check | Limitation |
|---|---|---|---|---|---|
| Christ's College | [Meals](https://www.christs.cam.ac.uk/student-life/meals) | Official college | Scheduled | Resolved | Link validated; no structured dated menu collected. |
| Churchill College | [Lunch and dinner menu](https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/) | Official college | Direct | Adapter/CORS passed | Page structure can change; only confidently dated sections are promoted. |
| Clare College | [Dining and catering](https://www.clare.cam.ac.uk/admissions-outreach/undergraduate-study/life-clare/dining-and-catering) | Official college | Scheduled | Resolved | Public overview, not a dated menu feed. |
| Clare Hall | [Dining](https://www.clarehall.cam.ac.uk/dining/) | Official college | Scheduled | Resolved | Access is host/guest-dependent; verify current rules. |
| Corpus Christi | [Food and dining](https://www.corpus.cam.ac.uk/undergraduate-study/living-corpus/food-and-dining) | Official college | Scheduled | Resolved | Additional student-body guidance is supplementary to the college page. |
| Darwin College | [Weekly menu](https://www.darwin.cam.ac.uk/dine/weekly-menu/) | Official college | Direct | Adapter/CORS passed | Structured endpoint exposes publication metadata, not dish fields. |
| Downing College | [Catering](https://www.dow.cam.ac.uk/current-students/catering) | Official college | Direct | Adapter/CORS passed | Kafoodle does not distinguish lunch items from dinner items. |
| Emmanuel College | [Living at Emmanuel — catering](https://www.emma.cam.ac.uk/explore/life) | Official college | Scheduled | Resolved | General current catering description; no public dated menu was collected. |
| Fitzwilliam College | [University college profile](https://www.undergraduate.study.cam.ac.uk/colleges/fitzwilliam-college) | Official University | Scheduled | Resolved | College's former food page returned 404; University profile is less detailed. |
| Girton College | [Dining and socialising](https://www.girton.cam.ac.uk/dining-and-socialising) | Official college | Scheduled | Resolved | Link-only evidence. |
| Gonville & Caius | [Accessibility and catering information](https://www.cai.cam.ac.uk/sites/default/files/accessibility_information.pdf) | Official college | Scheduled | Resolved | PDF may be replaced or become dated. |
| Homerton College | [Catering opening times](https://www.homerton.cam.ac.uk/sites/default/files/Catering%20Opening%20Times%20Term%20Time.pdf) | Official college | Scheduled | Resolved | Timetable PDF may not cover vacations or special closures. |
| Hughes Hall | [University college profile](https://www.undergraduate.study.cam.ac.uk/colleges/hughes-hall) | Official University | Scheduled | Resolved | No suitable public dated college menu found. |
| Jesus College | [Cafeteria](https://www.jesus.cam.ac.uk/college/life-jesus/food-and-drink/cafeteria) | Official college | Scheduled | Resolved | Link validated; protected or changed menu pages are not bypassed. |
| King's College | [Student finances and dining facilities](https://www.kings.cam.ac.uk/study/undergraduate-study/finances-and-financial-support) | Official college | Scheduled | Resolved | Confirms facilities and indicative context, not today's menu. |
| Lucy Cavendish College | [Meal portal](https://services.lucy.cam.ac.uk/meal-epos/) | Official college | Scheduled | Resolved | Portal may require authentication; authenticated content is never collected. |
| Magdalene College | [Catering](https://www.magd.cam.ac.uk/study-magdalene/undergraduate-study/accommodation-and-food/catering) | Official college | Scheduled | Resolved | Public page does not guarantee access for unhosted visitors. |
| Murray Edwards College | [College facilities](https://www.murrayedwards.cam.ac.uk/college-life/college-facilities) | Official college | Scheduled | Resolved | General facilities page, not dated menu evidence. |
| Newnham College | [Weekly and daily menus](https://newn.cam.ac.uk/weekly-and-daily-menus/) | Official college | Scheduled | Resolved and smoke-sampled | Link-only in this release; content is not promoted without a dedicated parser. |
| Pembroke College | [Servery menu](https://www.pem.cam.ac.uk/college/catering/information-students/servery-menu) | Official college | Scheduled | Resolved | Page changes and special closures require verification. |
| Peterhouse | [University college profile](https://www.undergraduate.study.cam.ac.uk/colleges/peterhouse) | Official University | Scheduled | Resolved | Former handbook URL returned 404; Petmenu remains labelled supplementary. |
| Queens' College | [Weekly menu](https://www.queens.cam.ac.uk/life-at-queens/catering/dining-hall/weekly-menu/) | Official college | Scheduled | Resolved | Link-only; no menu transcription or date inference. |
| Robinson College | [Garden Restaurant menu](https://www.robinson.cam.ac.uk/college-life/garden-restaurant-menu) | Official college | Scheduled | Resolved | Dated page still requires a dedicated guarded parser before promotion. |
| Selwyn College | [Hall menu](https://www.sel.cam.ac.uk/current-members/hall-menu) | Official college | Scheduled | Resolved and smoke-sampled | Replaced an obsolete beta host; menus remain link-only in the snapshot. |
| Sidney Sussex College | [Students' Union Hall guide](https://sscsu.org.uk/hall) | Official student body | Scheduled | Resolved | Maintained separately from the college; verify changes at source. |
| St Catharine's College | [MCR Hall times](https://mcr.caths.cam.ac.uk/current-students/hall-times) | Official student body | Scheduled | Resolved | Student-body timetable may not cover special closures. |
| St Edmund's College | [Menu archive](https://my.st-edmunds.cam.ac.uk/category/menus/) and [catering timetable](https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/) | Official college | Direct | Adapter/CORS passed | Weekly PDFs and exception notices depend on confidently matched dates. |
| St John's College | [Food and drink](https://www.joh.cam.ac.uk/live-and-study/food-and-drink) | Official college | Scheduled | Resolved | Public overview, not guaranteed daily menu evidence. |
| Trinity College | [Student experience and catering](https://www.trin.cam.ac.uk/access/outreach-home/student-experiences-at-trinity/) | Official college | Scheduled | Resolved | Access and service details are incomplete for outside students. |
| Trinity Hall | [Food and drink](https://www.trinhall.cam.ac.uk/study-with-us/life-trinity-hall/food-and-drink/) | Official college | Scheduled | Resolved | Link-only evidence. |
| Wolfson College | [Cafeteria menus](https://www.wolfson.cam.ac.uk/food/cafeteria-menus) | Official college | Scheduled | Full collector resolved; later smoke HTTP 403 | Intermittent automated blocking; last-good data must be retained. |

## Verification record

- Clean-install gate: `npm ci` installed 109 packages successfully, followed by a fresh full collection of all 27 scheduled primaries.
- Unit/integration gate: 23 files and 107 tests passed against the collected release snapshot, including native-dialog and collector-recovery regressions.
- Production build: Vite build passed; built snapshot validated with exactly 27 scheduled records.
- Direct live smoke: Churchill, Darwin, Downing, and St Edmund's passed payload-structure and browser-CORS checks.
- Scheduled collection: bounded full run resolved 27 of 27 corrected primary links and wrote a schema-valid temporary snapshot.
- Real-browser audit: headless Chrome confirmed 31 initial rows, the exact desktop column contract, shareable Churchill deep link, inert background, mandatory detail fields, map title, initial close-button focus, Escape close, focus restoration, search, previous-date control, 31 source groups, and the active Sources navigation state.
- Accessibility coverage: semantic table with scoped headers; named sort and row buttons; labelled date/search/filter controls; modal title; Escape; tested Tab and Shift+Tab containment; inert background; focus restoration; explicit text for loading, errors, Closed, and Unknown; HTTPS-only evidence links; image alt text; iframe title; visible focus rings; minimum 44px controls; reduced-motion rule. Chrome also confirmed the reduced-motion media preference is recognized.
- Responsive coverage: at a real 320px Chrome viewport, College, Services today, and Access remained visible; optional columns hid; horizontal overflow remained contained; and the detail dialog occupied the full viewport width.

## Archive and release checks

The v1 archive target is <https://sagarnidhish.github.io/cambridge-college-dining_old/>. It is outside this repository's Pages workflow and must be requested before and after v2 deployment. The main release target is <https://sagarnidhish.github.io/cambridge-college-dining/>.

Before deployment, Chrome rendered the preserved two-card Churchill/St Edmund's release successfully. Its static HTML SHA-256 was `1d0e9f6ba7fdf8de42f452061fd9e57a22d84b3bc13d710841f4566061879f2d`; the 1440×1000 rendered screenshot SHA-256 was `8beba8797898f2eba4419e6e6de91ded8713a3172b4c2b4e3ddbb0cd39d237c4`.

GitHub Actions run [31618072948](https://github.com/sagarnidhish/cambridge-college-dining/actions/runs/31618072948) completed successfully for commit `868301a`: clean install, collection, verification, built-data validation, artifact upload, and Pages deployment all passed. The deployed main site rendered exactly 31 table rows. Its public Churchill deep link rendered the modal detail, guest rules, notes/restrictions, titled map, and official verification source.

After deployment, the archive static HTML SHA-256 remained exactly `1d0e9f6ba7fdf8de42f452061fd9e57a22d84b3bc13d710841f4566061879f2d`. Chrome showed the same preserved two-card layout; only the expected live “Last checked” text advanced from 17:27 to 17:33. No archive repository or deployment setting was changed.
