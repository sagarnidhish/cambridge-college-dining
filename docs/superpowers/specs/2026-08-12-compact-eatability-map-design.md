# Compact Eatability Map and Dining Evidence Design

**Date:** 12 August 2026  
**Status:** Approved for autonomous implementation under the user's existing “go ahead; don't ask me” direction  
**Product:** Cambridge College Dining Directory v2.1

## Goal

Make the existing 31-college directory faster to scan and answer the practical question “Where can I eat on this date?” without overstating meal availability or visitor access. Add an integrated, key-free Google map, make college detail views materially more compact, apply explicit term-only rules to date eligibility, and improve price/access evidence wherever public sources support it.

## Existing behavior to preserve

- The public landing page opens to all 31 colleges in an alphabetical semantic table.
- Date controls, search, four evidence filters, sorting, deep-linked college details, Sources and Methodology, page-load counter, daily collection, exact-date browser cache, and the v1 archive remain available.
- Available, Closed, and Unknown retain their current meanings. Unknown must never be converted to Closed merely because evidence is absent.
- Every displayed timing, menu, price, access rule, restriction, and service-window rule keeps a direct verification link.
- Only HTTPS content is rendered. No authenticated pages, credentials, protection bypass, or inferred access are allowed.

## Scope boundary

### Included in v2.1

1. Compact landing controls and detail presentation.
2. A date-specific “Where can I eat?” list with explicit access tiers.
3. A dynamically focused Google map embedded beside that list.
4. Map links on every college title/name where a dining-area query is known.
5. Term-aware service rules backed by official evidence.
6. A systematic pass over all 31 profiles for public price, payment, and access evidence, with exact/approximate and as-of labels.
7. Source-adapter/snapshot enrichment for colleges whose public material supports dated or recurring meal claims.
8. Preservation of the page-load counter and existing release/archive safeguards.

### Deferred as separate products

- A café/bar subpage is deferred until the core meal directory has enough structured evidence. It will need its own venue types, hours, and source audit.
- Reviews or chat, including a Reddit link, are deferred because moderation, freshness, abuse handling, and review filters require a separate design.
- Cambridge-login guest requests are deferred because University authentication, privacy, consent, messaging, safety, and host accountability require a separate system and threat model.

No dead navigation or non-functional placeholder page is added for deferred work.

## Chosen map approach

The overview uses one key-free Google Maps embed focused on the currently selected eligible college:

```text
https://www.google.com/maps?q=<encoded dining-area query>&output=embed
```

Each college name also opens a separate verification/search link:

```text
https://www.google.com/maps/search/?api=1&query=<encoded dining-area query>
```

The first confirmed college in alphabetical order is focused initially; if there is no confirmed unhosted option, the first host/booking option is focused. Selecting another result updates the embed and its accessible title. If neither tier has a result, the map area explains that no location can be recommended from current evidence and does not show an arbitrary college.

This is preferred over:

- **Leaflet/OpenStreetMap multi-markers:** technically richer but does not meet the requested Google Maps experience and adds a new map/tile dependency.
- **Google My Maps:** permits multiple pins but requires separately maintained external state and cannot follow the selected date/filter evidence automatically.

The single-focus embed is dynamic, needs no API key, and keeps the exact college dining-area query visible.

## “Where can I eat?” eligibility contract

The panel is derived from the same immutable `DashboardState` as the table. It never performs a second interpretation of raw pages.

For the selected date, a college is:

- **Confirmed without a host** only when at least one meal has `availability: "available"`, the applicable service-window rule permits the selected date, and access is `unhosted-cambridge` with source evidence.
- **Host or booking needed** only when at least one meal is Available, the service-window rule permits the selected date, and access is `guest-required` with source evidence.
- **Excluded from the eatability list** when access is `members-only` or `unknown`, every meal is Closed/Unknown, the source is loading/error, or an explicit term-only rule excludes the date.

Excluded colleges remain visible in the full table. Copy must say “No option confirmed from current public evidence” rather than “No colleges are open.”

Each eligible result is a compact button showing college, dining area, available meal labels, next applicable time, access tier, and indicative price if sourced. Activating it focuses the map; a separate “Open details” action opens the existing deep-linked dialog.

The existing `Serving today` and access filters continue to operate on the full table. They do not alter the stricter eligibility contract.

## Term and service-window model

Term context must affect a meal only when the meal source states a term restriction. The domain gains an evidence-bearing service window:

```ts
type ServiceWindow =
  | { kind: "year-round"; source: SourceLink }
  | { kind: "full-term-only"; source: SourceLink }
  | { kind: "date-range"; validFrom: IsoDate; validThrough: IsoDate; source: SourceLink }
  | { kind: "date-specific"; source: SourceLink }
  | { kind: "unknown"; source?: SourceLink };
```

- `full-term-only` is evaluated against the checked-in official [University term-date calendar](https://www.cam.ac.uk/about-the-university/term-dates-and-calendars).
- `date-range` is inclusive and must be sourced; it is not synthesized from academic-year assumptions.
- `date-specific` applies only to the selected date parsed from dated material.
- `unknown` never closes a meal.

If an otherwise recurring meal is explicitly Full Term only and the selected date is outside Full Term, it becomes Closed with the compact note “Published for Full Term only.” If the application's supported official calendar does not cover the selected date, the meal becomes Unknown and the UI says “Term applicability not confirmed.”

The University term-date source is displayed on the methodology page and in the collapsed evidence area when it changes a meal state.

## Data enrichment and claim rules

All 31 college profiles are reviewed in source priority order:

1. Official college dated menu/feed.
2. Official college timetable, handbook, access, payment, or price page.
3. Official University profile where no suitable college page is public.
4. Official JCR/MCR/student-body source, labelled as such.
5. Supplementary source only as an explicitly labelled pointer, never as sole support for availability or access.

The user-supplied Robinson, Christ's, Clare, Clare Hall, Corpus Christi, Darwin, and Downing links are first-priority candidates, followed by the remaining catalog.

Prices use the existing `PriceQuote` structure:

- `precision: "exact"` only for a currently published amount or range.
- `precision: "approximate"` for a source-described typical amount or an explicitly dated older value that remains useful context.
- `audience` states whether the value is for members, Cambridge students, guests, or another defined group.
- `asOf` is mandatory and visible.
- No arithmetic estimate is generated from unrelated colleges or historical inflation.

Access classifications retain the current four values. Public menu visibility does not prove visitor access. “Confirmed without a host” requires explicit evidence that Cambridge students from another college can enter/pay without a member host.

Collector parsers may promote link-only data to `schedule` or `menu` coverage only when structural guards find non-empty applicable evidence. Parser drift yields Unknown plus a warning and preserves last-good data.

## Compact landing page

The desktop order is:

1. Main navigation.
2. Title and one-sentence evidence caveat.
3. One compact date/control bar.
4. “Where can I eat?” split panel: eligibility lists on the left, focused Google map on the right.
5. Search/filter controls in a disclosure labelled “Filter all 31 colleges,” open by default on desktop and closed by default on narrow mobile screens only when JavaScript can preserve accessibility.
6. Full college table.
7. Verification caveat and page-load counter.

At 720px and below the eligibility list and map stack. The map stays at least 15rem high. At 320px, essential table columns remain horizontally reachable as in v2.

## Compact college details

The dialog keeps the college title as a Google Maps link and shows the selected weekday/date immediately beneath it.

The visible summary contains:

- Dining area.
- Access tier and one-sentence permission summary.
- Payment rule.
- Term applicability.
- Indicative price or “Price not publicly confirmed.”
- Freshness label.

Meal presentation follows these rules:

- Closed meals are one sentence: `Closed today: Breakfast, brunch.`
- Unknown meals are separate: `Not confirmed: Dinner.`
- Breakfast and brunch are both tracked in state, but a detail block is rendered only for whichever is Available. If both are genuinely Available, both are rendered; the UI never hides contradictory published evidence.
- Each Available meal uses a compact block: meal/time heading, up to four menu items or one menu artifact, and one combined notes/restrictions paragraph.
- Additional menu items use native `<details>`.
- Repeated meal-level sources are deduplicated from the final source list.

Technical metadata moves under a collapsed native disclosure named `Evidence, freshness, and source timestamps`. It contains Last checked, Source modified, coverage, collection warnings, meal sources, access sources, price sources, and the final deduplicated source list.

Error/loading dialogs remain compact and always expose source links where available.

## URL, interaction, and accessibility behavior

- Existing `?college=<id>` deep links and Back/Forward behavior remain unchanged.
- Selecting a map result does not add browser history; opening details does.
- College/map buttons are real buttons with selected state exposed by `aria-pressed` or `aria-current`.
- The map iframe has title `<College> dining location map`, lazy loading, and restrictive referrer policy.
- Eligibility counts use a polite live region after refresh/date changes.
- The dialog keeps native modal behavior, Escape close, Tab containment, inert background, and focus restoration.
- Status is conveyed in text, not colour alone. Reduced-motion and visible-focus behavior remain.

## Error and empty states

- Source failures affect only their college and exact-date cached fallback remains allowed.
- The eligibility panel distinguishes loading, no confirmed unhosted options, no host-required options, and total absence of date-applicable evidence.
- A failed map URL never removes the eligibility list; the iframe is supplemental.
- An invalid map query is omitted rather than interpolated into a URL.
- Unsupported term years produce Unknown applicability, not Closed.

## Testing and release evidence

Implementation follows test-driven development. Required coverage includes:

- Pure eligibility selector tests for every access/availability/error/term boundary.
- Service-window tests inside/outside Full Term, inclusive date ranges, and unsupported years.
- Compact detail tests proving closed/unknown one-line summaries, breakfast/brunch tracking, evidence disclosure, source deduplication, and Maps title/link.
- Map panel tests for initial selection, selection changes, empty states, safe queries, and separation from detail history.
- Collector/parser regressions for every newly promoted source.
- Price/access evidence validation and catalog completeness for all 31 colleges.
- Responsive and keyboard browser audit at desktop, 720px, and 320px.
- Full `npm run verify`, live smoke, 31-row deployed render, detail deep link, and pre/post archive hash checks.

## Success criteria

The work is complete only when:

1. A selected date produces an honest, concise confirmed/host-needed list and an integrated focused Google map.
2. Every eligibility result is traceable to a date-applicable meal and sourced access classification.
3. Explicit term-only services disappear from eligibility and render Closed outside supported Full Term dates.
4. College detail dialogs are visibly shorter while retaining all mandatory information and sources.
5. All 31 profiles show sourced price/access facts when found and explicit unknowns otherwise.
6. No deferred café/community/login feature is presented as functional.
7. Automated, live, deployed, accessibility, and archive-invariance gates pass on the released exact commit.
