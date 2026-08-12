# Compact Eatability Map Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for every behavior change and commit after each green task.

**Goal:** Make the 31-college landing page compact and add a conservative, date-specific “Where can I eat?” list with a focused Google map, explicit term applicability, concise meal details, and source-backed access/price enrichment.

**Architecture:** Extend the existing immutable `DashboardState` with evidence-bearing service-window metadata, then derive effective meals and eatability results through pure domain selectors. Render the selector output in a new overview panel; keep the existing table and dialog as separate views of the same state. Catalog evidence remains static and auditable, while live/scheduled adapters may override it only with dated, validated evidence.

**Tech Stack:** TypeScript, Vite, Vitest, jsdom, native HTML dialog/details/iframe, CSS, GitHub Pages, daily snapshot collector.

---

## Task 1: Add evidence-bearing service windows and term applicability

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/dates.ts`
- Create: `src/domain/service-window.ts`
- Create: `tests/domain/service-window.test.ts`
- Modify: `tests/domain/dates.test.ts`

**Step 1: Write the failing domain tests**

Add tests for:

- `full-term-only` returning applicable on the first and last official Full Term dates.
- `full-term-only` returning outside on the dates immediately before and after Full Term.
- `full-term-only` returning unsupported for a selected date outside the checked-in calendar years.
- inclusive `date-range` boundaries.
- `date-specific` applying only when its evidence date equals the selected date.
- `year-round` always applying and `unknown` never asserting closure.
- an available recurring meal becoming Closed with `Published for Full Term only` outside a supported Full Term, but Unknown with `Term applicability not confirmed` for an unsupported year.

Run: `npm test -- tests/domain/service-window.test.ts tests/domain/dates.test.ts`

Expected: FAIL because `ServiceWindow`, `serviceWindowApplicability`, and `effectiveMealForDate` do not exist.

**Step 2: Implement the smallest domain API**

In `types.ts`, add:

```ts
export type ServiceWindow =
  | { kind: "year-round"; source: SourceLink }
  | { kind: "full-term-only"; source: SourceLink }
  | { kind: "date-range"; validFrom: IsoDate; validThrough: IsoDate; source: SourceLink }
  | { kind: "date-specific"; date: IsoDate; source: SourceLink }
  | { kind: "unknown"; source?: SourceLink };
```

Add `serviceWindow?: ServiceWindow` to `MealRecord` and `serviceWindows?: Partial<Record<MealType, ServiceWindow>>` to `CollegeProfile`. Keep absent metadata equivalent to `unknown` so existing snapshots remain compatible.

In `dates.ts`, export a tri-state `fullTermApplicability(date): "inside" | "outside" | "unsupported"`; keep `termLabel` backward compatible by delegating to it.

In `service-window.ts`, implement:

```ts
export type WindowApplicability = "applicable" | "outside" | "unknown";
export function serviceWindowApplicability(window: ServiceWindow | undefined, date: IsoDate): WindowApplicability;
export function effectiveMealForDate(meal: MealRecord, date: IsoDate): MealRecord;
```

Clone records rather than mutating snapshots. When term evidence changes availability, append the service-window source once.

**Step 3: Run focused and full tests**

Run: `npm test -- tests/domain/service-window.test.ts tests/domain/dates.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/dates.ts src/domain/service-window.ts tests/domain/service-window.test.ts tests/domain/dates.test.ts
git commit -m "feat: model date-applicable dining service"
```

## Task 2: Derive strict date-specific eatability results

**Files:**
- Create: `src/domain/eatability.ts`
- Create: `tests/domain/eatability.test.ts`
- Modify: `src/domain/fallback-day.ts`
- Modify: `tests/domain/fallback-day.test.ts`

**Step 1: Write the failing selector tests**

Cover:

- ready + Available + sourced `unhosted-cambridge` -> `confirmed`.
- ready + Available + sourced `guest-required` -> `host-required`.
- `members-only` and `unknown` access -> excluded.
- access classification without an access source -> excluded.
- every meal Closed/Unknown, loading, and error -> excluded.
- out-of-term Full Term service -> excluded after applying the effective meal.
- unsupported term calendar -> excluded because applicability is Unknown.
- deterministic college-name ordering.
- available meal labels, earliest published time, dining area, map query, price, and original college id are preserved.
- malformed/blank map queries are excluded rather than interpolated.

Run: `npm test -- tests/domain/eatability.test.ts`

Expected: FAIL because the selector does not exist.

**Step 2: Implement the pure selector**

Create:

```ts
export interface EatabilityResult {
  college: CollegeId;
  collegeName: string;
  tier: "confirmed" | "host-required";
  diningArea: string;
  mapQuery: string;
  meals: Array<{ type: MealType; time: string }>;
  nextTime: string | null;
  accessSummary: string;
  price: PriceQuote | null;
}

export function eatabilityResults(state: DashboardState): EatabilityResult[];
```

Use `effectiveMealForDate` on every meal. Require non-empty HTTPS source evidence for access. Parse `HH:MM` starts for `nextTime`; an unparseable time remains visible in `meals` but sorts after parseable times. Do not apply table filters to this selector.

Update `fallback-day.ts` so scheduled fallback records inherit profile service windows without asserting availability.

**Step 3: Run focused and full tests**

Run: `npm test -- tests/domain/eatability.test.ts tests/domain/fallback-day.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/domain/eatability.ts src/domain/fallback-day.ts tests/domain/eatability.test.ts tests/domain/fallback-day.test.ts
git commit -m "feat: derive conservative dining eligibility"
```

## Task 3: Render the “Where can I eat?” list and focused Google map

**Files:**
- Create: `src/ui/eatability-panel.ts`
- Create: `tests/ui/eatability-panel.test.ts`
- Modify: `src/ui/render.ts`
- Modify: `src/main.ts`
- Modify: `tests/ui/render.test.ts`
- Modify: `tests/app/main.test.ts`

**Step 1: Write failing UI tests**

Test that:

- the panel precedes the full filters/table on the directory page.
- confirmed and host-required lists use distinct headings and counts.
- first confirmed result is selected initially; otherwise first host-required result.
- clicking a result changes one iframe `src`, accessible `title`, external Maps link, and `aria-pressed` without opening the dialog or changing the query string.
- each result includes college, dining area, meal/time summary, access text, and supported price.
- “Open details” invokes `openCollege` and preserves existing deep-link behavior.
- zero results shows `No option confirmed from current public evidence` and renders no iframe.
- iframe is lazy, HTTPS-only, and uses `no-referrer-when-downgrade`.
- date refresh reselects a valid first result if the previous college is no longer eligible.

Run: `npm test -- tests/ui/eatability-panel.test.ts tests/ui/render.test.ts tests/app/main.test.ts`

Expected: FAIL because the panel and focused-college state do not exist.

**Step 2: Implement local map focus state**

Keep focused map state in the application controller as `CollegeId | null`, not in the URL. Add `focusEatabilityCollege(id)` to `DashboardActions`. Reconcile it after refresh/date changes against the current selector output; do not change selected detail state.

Implement `appendEatabilityPanel(parent, dashboard, focusedCollege, actions)` with two semantic lists and a single iframe. Construct both map URLs with `encodeURIComponent` only after rejecting blank queries.

**Step 3: Run focused and full tests**

Run: `npm test -- tests/ui/eatability-panel.test.ts tests/ui/render.test.ts tests/app/main.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/ui/eatability-panel.ts src/ui/render.ts src/main.ts tests/ui/eatability-panel.test.ts tests/ui/render.test.ts tests/app/main.test.ts
git commit -m "feat: add date-specific dining map panel"
```

## Task 4: Make the directory controls and college rows compact

**Files:**
- Modify: `src/ui/render.ts`
- Modify: `src/ui/table-model.ts`
- Modify: `tests/ui/render.test.ts`
- Modify: `tests/ui/table-model.test.ts`
- Modify: `src/styles.css`

**Step 1: Write failing rendering tests**

Require:

- filters live inside a native `<details>` with summary `Filter all 31 colleges`.
- the disclosure is open by default in the server-rendered/JS DOM path, so content is never inaccessible without viewport scripting.
- college table cells contain a Maps anchor on the college name plus a separate `Details` button.
- Maps anchor has `target=_blank`, `rel="noopener noreferrer"`, and an encoded dining-area query.
- clicking the anchor does not call `openCollege`; clicking Details does.
- result count and clear-filter behavior remain.

Run: `npm test -- tests/ui/render.test.ts tests/ui/table-model.test.ts`

Expected: FAIL against current button-only college cells and always-expanded controls.

**Step 2: Implement compact controls and row actions**

Expose `mapQuery` on `TableRowModel`. Replace the name button with an external name anchor and a short adjacent Details button. Wrap search/filters in native `<details open>`; CSS may visually compact it but must not make behavior viewport-dependent.

**Step 3: Add compact responsive CSS**

Reduce vertical padding, use a compact one-row date toolbar where space allows, maintain 44px interactive targets where possible, and preserve horizontal table scrolling at 320px. Do not hide mandatory service/access information.

**Step 4: Run focused and full tests**

Run: `npm test -- tests/ui/render.test.ts tests/ui/table-model.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/render.ts src/ui/table-model.ts src/styles.css tests/ui/render.test.ts tests/ui/table-model.test.ts
git commit -m "feat: compact the college directory"
```

## Task 5: Compact the detail dialog without losing mandatory evidence

**Files:**
- Modify: `src/ui/detail-dialog.ts`
- Modify: `tests/ui/detail-dialog.test.ts`
- Modify: `src/styles.css`

**Step 1: Write failing detail tests**

Assert:

- college title remains the external Maps link.
- visible summary contains dining area, access/permission, payment, term applicability, price, and freshness.
- Closed and Unknown meals each render as a single sentence.
- no detail block renders for Closed/Unknown breakfast or brunch.
- both breakfast and brunch blocks render if both are genuinely Available.
- each available meal heading combines meal label and time.
- menu items show at most four before native disclosure.
- meal notes and restrictions are one combined paragraph.
- one collapsed `<details>` is named `Evidence, freshness, and source timestamps`.
- timestamps, coverage, warning, meal/access/price sources, and final sources exist only inside that evidence disclosure.
- duplicate source URLs render once in the disclosure.
- no iframe remains in the dialog because the overview panel supplies the embedded map.

Run: `npm test -- tests/ui/detail-dialog.test.ts`

Expected: FAIL against current expanded metadata, separate notes/restrictions, repeated sources, and detail iframe.

**Step 2: Refactor the dialog**

Build a compact definition list. Render prices inline, including precision/audience/as-of. Combine notes and restrictions while retaining explicit “no special … published” copy when both are empty. Collect all sources into a URL-keyed map and render them once in the evidence disclosure with evidence label/as-of.

Keep modal, Escape, focus trap, inert background, deep-link, and focus restoration behavior unchanged.

**Step 3: Run focused and full tests**

Run: `npm test -- tests/ui/detail-dialog.test.ts tests/ui/query-state.test.ts tests/app/main.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/ui/detail-dialog.ts src/styles.css tests/ui/detail-dialog.test.ts
git commit -m "feat: condense dining detail evidence"
```

## Task 6: Audit and enrich all 31 catalog profiles

**Files:**
- Modify: `src/domain/catalog.ts`
- Create: `src/domain/catalog-validation.ts`
- Create: `tests/domain/catalog-validation.test.ts`
- Modify: `tests/domain/catalog.test.ts`
- Create: `docs/evidence/college-dining-evidence-2026-08-12.md`

**Step 1: Write failing catalog validation tests**

Require every canonical profile to have:

- non-empty name, dining area, and map query.
- at least one HTTPS source with evidence class.
- access summary, guest rule, and payment copy.
- source evidence whenever access is not Unknown.
- exact/approximate price semantics, non-empty audience/as-of, HTTPS source, and no duplicate price/source tuple.
- service-window source evidence when configured.
- no claim that menu visibility proves public access.

Add spot tests for the priority evidence:

- Robinson: `unhosted-cambridge`; non-member Garden Restaurant main prices and weekend brunch price; card/University Card payment; Full Term service window.
- Christ’s: term-time schedule; University Card/college-bill payment; guest-required, not unhosted.
- Clare: Full Term/term-time recurring schedule; approximately £5–£7 member meal; University Card/college-bill payment; access remains Unknown unless official guest evidence is explicit.
- Clare Hall: weekday lunch/supper times; Upay/member-host guest payment; guest-required.
- Corpus: official and JCR sources; 60% guest surcharge remains supplementary access context, not unhosted permission.
- Darwin: published schedule and per-dish price range; guest rates/host rules; seasonal closure warning represented as source note/date range only when exact dates are published.
- Downing: retain live API prices and `unhosted-cambridge` only with its existing explicit source evidence.

Run: `npm test -- tests/domain/catalog-validation.test.ts tests/domain/catalog.test.ts`

Expected: FAIL because validation and enriched claims are absent.

**Step 2: Create the evidence ledger**

For each of 31 colleges record: dining-area map query, chosen source URLs, access classification and quote-level paraphrase, payment, price, service window, evidence date, and unresolved unknowns. Use `Unknown — no public confirmation found` rather than inference. Label JCR/MCR sources as official student body and stale prices approximate.

**Step 3: Refactor catalog construction and add supported facts**

Allow `profile()` to accept explicit access guidance, prices, and service windows. Add the supported priority facts first, then review every remaining profile. Preserve Unknown when no explicit public statement confirms cross-college access, payment, or price.

**Step 4: Run focused and full tests**

Run: `npm test -- tests/domain/catalog-validation.test.ts tests/domain/catalog.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/catalog.ts src/domain/catalog-validation.ts tests/domain/catalog-validation.test.ts tests/domain/catalog.test.ts docs/evidence/college-dining-evidence-2026-08-12.md
git commit -m "feat: enrich college dining evidence"
```

## Task 7: Promote priority recurring/daily sources only through guarded parsers

**Files:**
- Create: `src/sources/robinson.ts`
- Create: `src/sources/christs.ts`
- Create: `src/sources/clare-hall.ts`
- Create: `src/sources/darwin.ts`
- Modify: `src/sources/fetch.ts`
- Modify: `src/snapshots/normalizer.ts`
- Modify: `scripts/collector/collect.mjs`
- Modify: `scripts/collector/schema.mjs`
- Create: `tests/sources/robinson.test.ts`
- Create: `tests/sources/christs.test.ts`
- Create: `tests/sources/clare-hall.test.ts`
- Create: `tests/sources/darwin.test.ts`
- Modify: `tests/snapshots/normalizer.test.ts`
- Modify: `tests/collector/collector.test.ts`
- Add fixture files under: `tests/fixtures/`

**Step 1: Add frozen official fixtures and failing parser tests**

For each source, save the smallest sanitized fixture that retains dates, weekday rows, times, menu entries, prices, access/payment statements, and service-window copy. Tests must cover current structures and drift guards:

- Robinson dated menu plus prices page; full-term breakfast/lunch/dinner and non-member prices.
- Christ’s term-time timetable; weekday breakfast/lunch/dinner and weekend brunch/dinner.
- Clare Hall weekday lunch/supper, with event/no-normal-dining notices remaining date-specific rather than global.
- Darwin weekly menu, weekday lunch/dinner, weekend brunch, price extraction, Wednesday/Friday term-time early close, and explicit closure notice.

Every parser must reject an apparently successful page that contains neither recognized meal headings nor valid time/menu evidence.

Run: `npm test -- tests/sources/robinson.test.ts tests/sources/christs.test.ts tests/sources/clare-hall.test.ts tests/sources/darwin.test.ts`

Expected: FAIL because adapters do not exist.

**Step 2: Implement parsers and fetch adapters**

Return `DiningDay` fragments with evidence-bearing service windows. Do not scrape authenticated endpoints or bypass protection. If browser CORS prevents direct fetch, collect the public page in the scheduled GitHub workflow and consume only the validated snapshot client-side.

**Step 3: Extend snapshot schema without breaking v1 data**

Add optional service-window fields and validated access/price payloads. The normalizer must accept old snapshots, reject invalid window ranges/non-HTTPS sources, and prefer exact-date live evidence over catalog defaults.

**Step 4: Run focused and full tests**

Run: `npm test -- tests/sources/robinson.test.ts tests/sources/christs.test.ts tests/sources/clare-hall.test.ts tests/sources/darwin.test.ts tests/snapshots/normalizer.test.ts tests/collector/collector.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/sources src/snapshots scripts/collector tests/sources tests/snapshots tests/collector tests/fixtures
git commit -m "feat: collect priority college dining schedules"
```

## Task 8: Finish responsive styling, accessibility, and methodology copy

**Files:**
- Modify: `src/styles.css`
- Modify: `src/ui/methodology.ts`
- Modify: `tests/ui/methodology.test.ts`
- Modify: `tests/ui/render.test.ts`
- Modify: `README.md`

**Step 1: Write failing content/accessibility tests**

Require methodology to explain:

- strict confirmed/host-needed eligibility rules.
- Unknown versus Closed.
- Full Term source and unsupported-year behavior.
- exact versus approximate price labels.
- map focus behavior and direct Maps verification links.
- deferred café/review/login functions are not currently provided.

Require the panel count to be a polite live region and map/result selected state to be textual/ARIA-visible.

Run: `npm test -- tests/ui/methodology.test.ts tests/ui/render.test.ts`

Expected: FAIL until copy and attributes are complete.

**Step 2: Add final styles and documentation**

At desktop use a two-column panel; at `max-width: 720px` stack list and map; at 320px retain controls and table scrolling. Add visible focus, reduced-motion behavior, status text, map minimum height 15rem, and compact dialog spacing. Update README feature and provenance sections, including the unchanged archive link.

**Step 3: Run automated accessibility-oriented checks**

Run: `npm test -- tests/ui/methodology.test.ts tests/ui/render.test.ts tests/ui/eatability-panel.test.ts tests/ui/detail-dialog.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm run build`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/styles.css src/ui/methodology.ts tests/ui/methodology.test.ts tests/ui/render.test.ts README.md
git commit -m "docs: explain dining eligibility and evidence"
```

## Task 9: Verify, release, and prove archive invariance

**Files:**
- Modify only if evidence requires it: `.github/workflows/collect-dining.yml`
- Modify only if evidence requires it: `.github/workflows/deploy-pages.yml`
- Create: `docs/release/2026-08-12-compact-eatability-map.md`

**Step 1: Record the archive baseline**

Fetch the archived site and record HTTP status plus hashes for `index.html` and primary JS/CSS assets. Record the archive URL: `https://sagarnidhish.github.io/cambridge-college-dining_old/`.

**Step 2: Run the full local verification gate**

Run: `npm run verify`

Expected: all tests, typecheck, and production build PASS.

Run: `npm run smoke:live`

Expected: every configured public endpoint responds with the structure expected by its adapter; protected/unreachable endpoints are reported conservatively and do not become availability claims.

Run: `git diff --check && git status --short`

Expected: clean after release evidence commit.

**Step 3: Perform manual browser audit**

Serve the production build and check desktop, 720px, and 320px:

- all 31 rows render.
- date change and refresh reconcile the eatability list/map.
- no unsupported college enters an eligibility tier.
- map buttons, external Maps links, Details, deep links, Back/Forward, Escape, Tab containment, and focus restoration work.
- closed/unknown summaries and evidence disclosure remain concise but complete.
- counter is visible and non-blocking.

Record screenshots or precise observations in the release note; temporary artifacts stay outside Git unless intentionally documented.

**Step 4: Commit release evidence**

```bash
git add docs/release/2026-08-12-compact-eatability-map.md .github/workflows/collect-dining.yml .github/workflows/deploy-pages.yml
git commit -m "docs: record compact map release evidence"
```

Omit unchanged workflow files from the commit.

**Step 5: Integrate and deploy exact HEAD**

Use the finishing-development-branch workflow to merge the isolated branch into `main`, rerun `npm run verify`, push `main`, and watch the Pages deployment plus daily collector workflow to success. Confirm the deployed commit SHA matches local `HEAD`.

**Step 6: Verify the public site and archive**

On the public site verify 31 rows, selected date, at least one source-supported eligibility result when evidence exists, focused map update, one college detail deep link, Sources and Methodology, and page counter.

Re-fetch the archive and compare the same hashes. The release fails if the archived copy changed.

**Step 7: Final repository audit**

Run:

```bash
git status --short --branch
git log -1 --oneline
gh run list --limit 10
```

Expected: clean `main`, synced origin, exact deployed commit, successful Pages workflow, successful collector, and unchanged archive.
