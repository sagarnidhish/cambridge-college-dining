# All-College Dining Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a GitHub Pages dining directory whose public landing table always contains all 31 Cambridge colleges and whose accessible detail dialog exposes selected-date meals, times, restrictions, access evidence, prices, maps, freshness, and verification links.

**Architecture:** Keep the application as dependency-light TypeScript/Vite. A canonical catalog and normalized `DiningDay` model feed a college-indexed session: Churchill, St Edmund's, Darwin, and Downing use direct browser adapters, while the other 27 consume schema-validated daily JSON snapshots with explicit `menu`, `schedule`, or `link-only` coverage. Pure table selectors and DOM renderers present the state; URL query state controls the selected college; exact-date cache and last-good collector rules fail closed.

**Tech Stack:** Node.js 20.19+, TypeScript 7, Vite 8, Vitest 4, jsdom 27, browser Fetch/DOM APIs, Node collector scripts, GitHub Actions, GitHub Pages.

## Global Constraints

- The canonical inventory is exactly the 31 entries in the University of Cambridge College A–Z.
- The public root opens directly to the college table with no authentication interstitial.
- Every college detail displays date, weekday, all four meal states, time, menu state or content, notes or restrictions, access, price, freshness, and source links; unknown values remain explicit.
- Only Churchill, St Edmund's, Darwin, and Downing are direct browser sources; the other 27 use schema-valid scheduled snapshots.
- Direct, scheduled, and cached data are labelled `Live`, `Scheduled snapshot`, and `Cached fallback` respectively.
- Only official evidence can establish `unhosted-cambridge`; initially this applies only to Downing.
- Remote HTML is never injected, external URLs must be HTTPS, and blocked or authenticated content is not bypassed.
- A failed college cannot block the other 30, replace last-good snapshot data, or manufacture closures.
- The existing archive at `https://sagarnidhish.github.io/cambridge-college-dining_old/` is not modified.
- No application server, database, paid API, API key, repository secret, or bot commit is introduced.

---

### Task 1: Canonical catalog and normalized domain

**Files:**
- Create: `src/domain/catalog.ts`
- Create: `src/domain/fallback-day.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/dates.ts`
- Test: `tests/domain/catalog.test.ts`
- Test: `tests/domain/fallback-day.test.ts`
- Test: `tests/domain/dates.test.ts`

**Interfaces:**
- Consumes: existing `IsoDate`, `MEAL_TYPES`, and `weekdayForIso(date)`.
- Produces: `COLLEGE_IDS`, `CollegeId`, `COLLEGES`, `collegeById(id)`, the enriched domain types, `unknownDiningDay(profile, date, fetchedAt, freshness, warning?)`, and `termStatusFor(date)`.

- [x] **Step 1: Write catalog and fallback tests that require all 31 colleges and four explicit unknown meals**

```ts
import { describe, expect, it } from "vitest";
import { COLLEGES, COLLEGE_IDS, collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";

describe("college catalog", () => {
  it("contains 31 unique colleges in alphabetical display order", () => {
    expect(COLLEGES).toHaveLength(31);
    expect(new Set(COLLEGE_IDS).size).toBe(31);
    expect(COLLEGES.map((college) => college.name)).toEqual(
      [...COLLEGES].map((college) => college.name).sort((a, b) => a.localeCompare(b, "en-GB"))
    );
    expect(collegeById("gonville-caius").name).toBe("Gonville & Caius");
  });
});

it("builds a complete explicit unknown day", () => {
  const day = unknownDiningDay(collegeById("newnham"), "2026-08-12", "2026-08-12T08:00:00.000Z", "scheduled");
  expect(Object.keys(day.meals)).toEqual(["breakfast", "brunch", "lunch", "dinner"]);
  expect(day.meals.lunch).toMatchObject({ availability: "unknown", time: "Time not published" });
  expect(day.meals.lunch.menu).toEqual([{ kind: "message", message: "Menu not publicly confirmed" }]);
});
```

- [x] **Step 2: Run the focused tests and confirm the new imports fail**

Run: `npm test -- tests/domain/catalog.test.ts tests/domain/fallback-day.test.ts`

Expected: FAIL because `catalog.ts`, `fallback-day.ts`, and the enriched types do not exist.

- [x] **Step 3: Define exact normalized types and the catalog shape**

```ts
export const MEAL_TYPES = ["breakfast", "brunch", "lunch", "dinner"] as const;
export const COLLEGE_IDS = [
  "christs", "churchill", "clare", "clare-hall", "corpus-christi", "darwin", "downing", "emmanuel",
  "fitzwilliam", "girton", "gonville-caius", "homerton", "hughes-hall", "jesus", "kings", "lucy-cavendish",
  "magdalene", "murray-edwards", "newnham", "pembroke", "peterhouse", "queens", "robinson", "selwyn",
  "sidney-sussex", "st-catharines", "st-edmunds", "st-johns", "trinity", "trinity-hall", "wolfson"
] as const;
export type CollegeId = (typeof COLLEGE_IDS)[number];
export type Freshness = "live" | "scheduled" | "cached";
export type EvidenceKind = "official-college" | "official-university" | "official-student-body" | "supplementary";
export type AccessClass = "unhosted-cambridge" | "guest-required" | "members-only" | "unknown";
export type SnapshotCoverage = "menu" | "schedule" | "link-only";

export interface SourceLink {
  label: string;
  url: string;
  evidence: EvidenceKind;
  asOf?: string;
}

export type MenuContent =
  | { kind: "items"; items: string[] }
  | { kind: "pdf"; label: string; url: string }
  | { kind: "image"; label: string; url: string; alt: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "message"; message: string };

export interface AccessGuidance { classification: AccessClass; summary: string; guestRules: string; payment: string; sourceLinks: SourceLink[] }
export interface PriceQuote { label: string; amount: string; precision: "exact" | "approximate"; audience: string; asOf: string; source: SourceLink }
export interface MealRecord { type: MealType; availability: Availability; time: string; menu: MenuContent[]; notes: string[]; restrictions: string[]; sourceLinks: SourceLink[] }
export interface DiningDay { college: CollegeId; collegeName: string; date: IsoDate; weekday: string; timeZone: "Europe/London"; meals: Record<MealType, MealRecord>; location: { diningArea: string; mapQuery: string }; access: AccessGuidance; prices: PriceQuote[]; termLabel: string; notices: string[]; sourceLinks: SourceLink[]; sourceModifiedAt: string | null; fetchedAt: string; freshness: Freshness; coverage: SnapshotCoverage; collectionWarning?: string }
export interface CollegeProfile { id: CollegeId; name: string; diningArea: string; mapQuery: string; retrieval: "direct" | "scheduled"; sources: SourceLink[]; access: AccessGuidance; prices: PriceQuote[] }
```

Populate `COLLEGES` as a readonly array using the 31 names, IDs, dining-area/map queries, retrieval classes, and source URLs from the approved spec. Import `COLLEGE_IDS` and `CollegeId` from `types.ts`; assert at module load that every tuple ID has exactly one profile and no profile has an unknown ID.

- [x] **Step 4: Implement the unknown-day constructor and supported Full Term boundaries**

```ts
export function unknownDiningDay(profile: CollegeProfile, date: IsoDate, fetchedAt: string, freshness: Freshness, warning?: string): DiningDay {
  const meal = (type: MealType): MealRecord => ({
    type,
    availability: "unknown",
    time: "Time not published",
    menu: [{ kind: "message", message: "Menu not publicly confirmed" }],
    notes: [],
    restrictions: [],
    sourceLinks: profile.sources
  });
  return {
    college: profile.id,
    collegeName: profile.name,
    date,
    weekday: weekdayForIso(date),
    timeZone: "Europe/London",
    meals: { breakfast: meal("breakfast"), brunch: meal("brunch"), lunch: meal("lunch"), dinner: meal("dinner") },
    location: { diningArea: profile.diningArea, mapQuery: profile.mapQuery },
    access: profile.access,
    prices: profile.prices,
    termLabel: termStatusFor(date),
    notices: [],
    sourceLinks: profile.sources,
    sourceModifiedAt: null,
    fetchedAt,
    freshness,
    coverage: "link-only",
    ...(warning === undefined ? {} : { collectionWarning: warning })
  };
}
```

Encode published Full Term start/end pairs for 2025–26 through 2028–29 in `dates.ts`. `termStatusFor` returns `Full Term`, `Outside Full Term`, or `Term dates not confirmed`; it never extrapolates.

- [x] **Step 5: Run domain tests and type checking**

Run: `npm test -- tests/domain/catalog.test.ts tests/domain/fallback-day.test.ts tests/domain/dates.test.ts && npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit the domain milestone**

```bash
git add src/domain tests/domain
git commit -m "feat: add all-college dining domain"
```

### Task 2: Scheduled snapshot schema, bootstrap, and exact-date cache v2

**Files:**
- Create: `src/snapshots/schema.ts`
- Create: `src/snapshots/normalize.ts`
- Create: `public/data/college-dining.json`
- Modify: `src/storage/cache.ts`
- Test: `tests/snapshots/schema.test.ts`
- Test: `tests/snapshots/normalize.test.ts`
- Test: `tests/storage/cache.test.ts`

**Interfaces:**
- Consumes: `DiningDay`, `CollegeProfile`, `COLLEGES`, `unknownDiningDay`.
- Produces: `ScheduledSnapshot`, `parseScheduledSnapshot(value)`, `scheduledDayFor(snapshot, profile, date)`, `loadCachedDay(storage, college, date)`, and `saveCachedDay(storage, day)` using cache key version `v2`.

- [x] **Step 1: Write failing validation, normalization, and cache tests**

```ts
it("rejects a snapshot missing one scheduled college", () => {
  const invalid = { schemaVersion: 2, collectedAt: "2026-08-12T06:00:00.000Z", colleges: {} };
  expect(() => parseScheduledSnapshot(invalid)).toThrow(/27 scheduled colleges/);
});

it("keeps a link-only record unknown rather than closed", () => {
  const day = scheduledDayFor(snapshotFixture, collegeById("jesus"), "2026-08-12");
  expect(day.coverage).toBe("link-only");
  expect(day.meals.lunch.availability).toBe("unknown");
  expect(day.freshness).toBe("scheduled");
});

it("loads only a valid exact-date v2 cached day and relabels it cached", () => {
  saveCachedDay(storage, dayFixture);
  expect(loadCachedDay(storage, dayFixture.college, dayFixture.date)?.freshness).toBe("cached");
  expect(loadCachedDay(storage, dayFixture.college, "2026-08-13")).toBeNull();
});
```

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/snapshots/schema.test.ts tests/snapshots/normalize.test.ts tests/storage/cache.test.ts`

Expected: FAIL because the snapshot modules and cache v2 validator are absent.

- [x] **Step 3: Implement a fail-closed JSON validator**

Use this deployable shape:

```ts
export interface ScheduledCollegeRecord {
  college: CollegeId;
  coverage: SnapshotCoverage;
  collectedAt: string;
  sourceModifiedAt: string | null;
  validFrom: IsoDate | null;
  validThrough: IsoDate | null;
  mealsByDate: Partial<Record<IsoDate, Partial<Record<MealType, Omit<MealRecord, "type">>>>>;
  recurringMeals: Partial<Record<MealType, Omit<MealRecord, "type">>>;
  notices: string[];
  warning?: string;
}
export interface ScheduledSnapshot { schemaVersion: 2; collectedAt: string; colleges: Record<ScheduledCollegeId, ScheduledCollegeRecord> }
```

Validate plain objects, exact schema version, parseable timestamps, ISO dates, HTTPS source/menu URLs, known college IDs, and the exact set of 27 scheduled IDs. Reject `available` meals whose time and menu are both unpublished. Unknown input must never be type-cast without checks.

- [x] **Step 4: Add a schema-valid bootstrap with all 27 scheduled profiles**

Create `public/data/college-dining.json` with `schemaVersion: 2`, a real generation timestamp, and one record for each scheduled catalog entry. Use `link-only` when only a verification link is safe. Use `schedule` only for recurring hours explicitly supported by the source inventory. All absent meal facts remain unknown.

- [x] **Step 5: Implement snapshot normalization and cache v2**

`scheduledDayFor` starts from `unknownDiningDay`, overlays only a matching dated meal or an explicitly recurring meal, keeps missing fields unknown, combines notices, and preserves the record timestamp. `cache.ts` validates all 31 IDs, exact weekday/date consistency, parseable timestamps, HTTPS links, four meal keys, enriched access/price fields, and stores under `college-dining:v2:<college>:<date>`.

- [x] **Step 6: Run focused tests and type checking**

Run: `npm test -- tests/snapshots tests/storage/cache.test.ts && npm run typecheck`

Expected: PASS.

- [x] **Step 7: Commit the snapshot milestone**

```bash
git add src/snapshots src/storage/cache.ts public/data/college-dining.json tests/snapshots tests/storage/cache.test.ts
git commit -m "feat: add validated scheduled dining snapshots"
```

### Task 3: Enrich Churchill and St Edmund's adapters without regressions

**Files:**
- Modify: `src/sources/churchill.ts`
- Modify: `src/sources/st-edmunds.ts`
- Modify: `src/sources/fetch.ts`
- Modify: `tests/sources/churchill.test.ts`
- Modify: `tests/sources/st-edmunds.test.ts`
- Modify: `tests/fixtures/churchill.ts`
- Modify: `tests/fixtures/st-edmunds.ts`

**Interfaces:**
- Consumes: enriched `DiningDay`, `MealRecord.menu[]`, `collegeById`, and existing WordPress snapshots.
- Produces: unchanged call signatures `parseChurchillDay(page, date, fetchedAt)` and `parseStEdmundsDay(posts, cateringPage, date, fetchedAt)` returning enriched live days.

- [x] **Step 1: Extend adapter assertions before changing implementation**

```ts
expect(day).toMatchObject({
  college: "churchill",
  freshness: "live",
  coverage: "menu",
  access: { classification: "guest-required" },
  location: { diningArea: expect.any(String) }
});
expect(day.meals.lunch.menu[0]).toMatchObject({ kind: "items" });
expect(day.meals.lunch.restrictions).toEqual(expect.any(Array));
```

Retain the existing regression cases for split St Edmund's notices, AM/PM timetable rows, weekly headings without a year, exception times, week-aware date resolution, and complete schedule drift.

- [x] **Step 2: Run the two adapter suites and confirm type/shape failures**

Run: `npm test -- tests/sources/churchill.test.ts tests/sources/st-edmunds.test.ts`

Expected: FAIL because current adapters return the v1 model.

- [x] **Step 3: Convert each adapter through a profile-backed base day**

Construct `const day = unknownDiningDay(collegeById("churchill"), date, fetchedAt, "live")`, then overlay only parsed meals and notices. Set `coverage: "menu"` only when dated menu content was confidently parsed; otherwise keep `schedule` or `link-only`. Convert every menu value to the array union, attach evidence-bearing source links, and keep meal restrictions separate from notes.

- [x] **Step 4: Preserve parser-drift safety**

If an expected recurring timetable structure is wholly unrecognized, return unknown meal states with a warning; do not turn all meals closed. St Edmund's date-only paragraphs must bind following service paragraphs until the next dated heading, without leaking the notice to another date.

- [x] **Step 5: Run adapters, full source tests, and type checking**

Run: `npm test -- tests/sources && npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit the adapted direct sources**

```bash
git add src/sources tests/sources tests/fixtures
git commit -m "refactor: enrich existing live dining adapters"
```

### Task 4: Add Darwin and Downing live adapters

**Files:**
- Create: `src/sources/darwin.ts`
- Create: `src/sources/downing.ts`
- Modify: `src/sources/fetch.ts`
- Create: `tests/fixtures/darwin.ts`
- Create: `tests/fixtures/downing.ts`
- Create: `tests/sources/darwin.test.ts`
- Create: `tests/sources/downing.test.ts`

**Interfaces:**
- Consumes: `unknownDiningDay`, WordPress helpers, validated HTTPS URL helpers, Darwin pages 52/54, and Downing Kafoodle WBA JSON.
- Produces: `fetchDarwinSnapshot(fetchImpl)`, `parseDarwinDay(snapshot, date, fetchedAt)`, `fetchDowningSnapshot(fetchImpl, date)`, and `parseDowningDay(snapshot, date, fetchedAt)`.

- [x] **Step 1: Capture minimal sanitized fixtures and write date-specific tests**

```ts
it("maps Darwin's dated lunch and dinner without treating headers as dishes", () => {
  const day = parseDarwinDay(darwinFixture, "2026-08-12", fetchedAt);
  expect(day.meals.lunch.availability).toBe("available");
  expect(day.meals.lunch.menu.flatMap((entry) => entry.kind === "items" ? entry.items : [])).toContain("Roasted vegetable tart");
  expect(day.sourceLinks.every((source) => source.evidence === "official-college")).toBe(true);
});

it("maps Downing meals, allergens, price, and official unhosted access", () => {
  const day = parseDowningDay(downingFixture, "2026-08-12", fetchedAt);
  expect(day.access.classification).toBe("unhosted-cambridge");
  expect(day.meals.lunch.restrictions).toContain("Contains: gluten");
  expect(day.prices[0]).toMatchObject({ precision: "exact", audience: expect.any(String) });
});
```

- [x] **Step 2: Run both new suites and verify missing-module failures**

Run: `npm test -- tests/sources/darwin.test.ts tests/sources/downing.test.ts`

Expected: FAIL because the adapters do not exist.

- [x] **Step 3: Implement Darwin parsing with structural guards**

Fetch the official REST representations with `cache: "no-store"`. Identify weekday/date sections, normalize Unicode times, strip tags through DOM parsing, and require at least one recognized meal heading plus non-empty dish content before setting `coverage: "menu"`. A changed page yields unknowns and `collectionWarning`, not closures.

- [x] **Step 4: Implement Downing Kafoodle parsing with structural guards**

Fetch the official public WBA base data, identify its group ID, POST the selected-date query payload, and map only recognized service/category/product records. Deduplicate allergens and dietary labels. Use the official catering page as access evidence; do not infer access merely from the API being public.

- [x] **Step 5: Run all direct adapter tests and type checking**

Run: `npm test -- tests/sources && npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit the new live adapters**

```bash
git add src/sources tests/sources tests/fixtures
git commit -m "feat: add Darwin and Downing live dining"
```

### Task 5: Generic 31-college session with per-college isolation

**Files:**
- Modify: `src/app/dashboard-session.ts`
- Modify: `src/sources/fetch.ts`
- Modify: `tests/app/dashboard-session.test.ts`

**Interfaces:**
- Consumes: four direct fetch/parser pairs, `parseScheduledSnapshot`, `scheduledDayFor`, `COLLEGES`, and cache v2.
- Produces: `createDashboardSession(deps)` whose `refresh(date)` and `selectDate(date)` return `DashboardState` containing every `CollegeId`.

- [x] **Step 1: Replace two-college tests with all-college and isolation tests**

```ts
it("returns exactly 31 states when one direct source rejects", async () => {
  const state = await session.refresh("2026-08-12");
  expect(Object.keys(state.colleges)).toHaveLength(31);
  expect(state.colleges.churchill.status).toBe("error");
  expect(state.colleges.newnham.status).toBe("ready");
});

it("uses the exact-date cached day after a failed explicit refresh without rewriting its timestamp", async () => {
  const first = await session.refresh("2026-08-12");
  const fetchedAt = ready(first.colleges.darwin).fetchedAt;
  directFetches.darwin.mockRejectedValueOnce(new Error("offline"));
  const second = await session.refresh("2026-08-12");
  expect(ready(second.colleges.darwin)).toMatchObject({ freshness: "cached", fetchedAt });
});
```

- [x] **Step 2: Run the session tests and confirm current hard-coding fails**

Run: `npm test -- tests/app/dashboard-session.test.ts`

Expected: FAIL because only two state keys are returned.

- [x] **Step 3: Implement college-indexed refresh orchestration**

Fetch the scheduled JSON once and the four direct sources independently with `Promise.allSettled`. Build the 31-key state from `COLLEGES`; normalize each result inside its own `try/catch`. On a failed current refresh, use exact-date cache or error. Retain successful raw direct snapshots only for `selectDate`; do not reuse them as a current-refresh success. Ignore late refresh generations.

- [x] **Step 4: Validate scheduled response before any record is used**

If the scheduled JSON fails schema validation, serve per-college exact-date cache/error for all 27 scheduled entries while preserving direct results. A valid scheduled record is cached only after a complete `DiningDay` is normalized.

- [x] **Step 5: Run session, cache, source, and type suites**

Run: `npm test -- tests/app tests/storage tests/sources && npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit the session milestone**

```bash
git add src/app src/sources/fetch.ts tests/app
git commit -m "feat: orchestrate all college dining sources"
```

### Task 6: Pure table selectors, search, sort, and evidence filters

**Files:**
- Create: `src/ui/table-model.ts`
- Create: `tests/ui/table-model.test.ts`

**Interfaces:**
- Consumes: `DashboardState`, `DiningDay`, and `CollegeViewState`.
- Produces: `TableOptions`, `TableRowModel`, `tableRows(state, options)`, `servicesToday(day)`, and `nextMeal(day, nowMinutes?)`.

- [x] **Step 1: Write selector tests for ordering, summaries, combined filters, and errors**

```ts
it("starts with 31 alphabetical rows and keeps unknown colleges visible", () => {
  const rows = tableRows(stateFixture, DEFAULT_TABLE_OPTIONS);
  expect(rows).toHaveLength(31);
  expect(rows.map((row) => row.name)).toEqual([...rows.map((row) => row.name)].sort((a, b) => a.localeCompare(b, "en-GB")));
});

it("requires affirmative evidence for serving, menu, and unhosted filters", () => {
  const rows = tableRows(stateFixture, { ...DEFAULT_TABLE_OPTIONS, serving: true, menuPublished: true, unhosted: true });
  expect(rows.every((row) => row.isServing && row.hasPublishedMenu && row.accessClass === "unhosted-cambridge")).toBe(true);
});
```

- [x] **Step 2: Run the selector suite and verify RED**

Run: `npm test -- tests/ui/table-model.test.ts`

Expected: FAIL because `table-model.ts` does not exist.

- [x] **Step 3: Implement deterministic row derivation**

```ts
export interface TableOptions {
  query: string;
  serving: boolean;
  unhosted: boolean;
  menuPublished: boolean;
  accessUnknown: boolean;
  sort: "college" | "services" | "next" | "access" | "price" | "freshness";
  direction: "asc" | "desc";
}
```

For ready days, derive affirmative booleans from meal/access data. For loading/error states, preserve the row with readable summary text. Search normalized college and dining-area names. Apply all active filters as AND conditions, then use a stable `en-GB` sort with college name as the tie-breaker. `nextMeal` compares published 24-hour start times; if no parseable future service exists, return `No later published service`.

- [x] **Step 4: Run selector and type tests**

Run: `npm test -- tests/ui/table-model.test.ts && npm run typecheck`

Expected: PASS.

- [x] **Step 5: Commit the table model**

```bash
git add src/ui/table-model.ts tests/ui/table-model.test.ts
git commit -m "feat: add dining table selectors"
```

### Task 7: Public landing table and date/filter controls

**Files:**
- Create: `src/ui/table.ts`
- Modify: `src/ui/render.ts`
- Modify: `src/ui/mount.ts`
- Modify: `tests/ui/render.test.ts`
- Modify: `tests/ui/mount.test.ts`

**Interfaces:**
- Consumes: `tableRows`, `TableOptions`, `DashboardState`, and date helpers.
- Produces: `renderDashboard(root, viewState, actions)` with a semantic 31-row table and UI actions for date/search/filter/sort/refresh.

- [x] **Step 1: Write DOM tests for immediate table rendering and controls**

```ts
it("renders all colleges as accessible table row buttons", () => {
  renderDashboard(root, viewFixture, actions);
  expect(root.querySelectorAll("tbody tr")).toHaveLength(31);
  expect(root.querySelector('button[aria-label="Open Churchill College dining details for Wednesday, 12 August 2026"]')).not.toBeNull();
});

it("keeps selected date while search, filters, and sorting change", () => {
  root.querySelector<HTMLInputElement>('input[type="search"]')!.value = "wolfson";
  root.querySelector<HTMLInputElement>('input[type="search"]')!.dispatchEvent(new Event("input", { bubbles: true }));
  expect(actions.setQuery).toHaveBeenCalledWith("wolfson");
  expect(actions.selectDate).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Run render and mount tests and confirm RED**

Run: `npm test -- tests/ui/render.test.ts tests/ui/mount.test.ts`

Expected: FAIL because the v1 card renderer has no table controls.

- [x] **Step 3: Render a semantic table with button-based row activation**

Render the exact desktop columns `College`, `Services today`, `Next meal/time`, `Access`, `Indicative price`, and `Freshness`. Place a full-width button inside the college-name cell instead of making `<tr>` itself interactive. Include readable live regions for loading/errors and an empty-result row with active-filter explanation and Clear filters button.

- [x] **Step 4: Add stateful controls in `mountDashboard`**

Maintain `selectedDate`, `TableOptions`, and `selectedCollege` independently. Search updates on input; checkbox filters update immediately; sort buttons toggle direction; date controls retain options. `loadingState` is generated from `COLLEGES` so 31 rows render before network completion.

- [x] **Step 5: Run UI, session, and type tests**

Run: `npm test -- tests/ui tests/app && npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit the landing table**

```bash
git add src/ui src/app tests/ui
git commit -m "feat: render all-college dining table"
```

### Task 8: Accessible detail drawer, URL state, maps, and mandatory fields

**Files:**
- Create: `src/ui/detail-dialog.ts`
- Create: `src/ui/query-state.ts`
- Modify: `src/ui/render.ts`
- Modify: `src/ui/mount.ts`
- Create: `tests/ui/detail-dialog.test.ts`
- Create: `tests/ui/query-state.test.ts`
- Modify: `tests/ui/mount.test.ts`

**Interfaces:**
- Consumes: selected `CollegeViewState`, current date, and safe source URLs.
- Produces: `appendDetailDialog(parent, state, date, onClose)`, `collegeFromLocation(location)`, `setCollegeInHistory(id|null, mode)`, and Back/Forward synchronization.

- [x] **Step 1: Write mandatory-content and interaction tests**

```ts
it("renders required dining evidence while grouping closed and unknown meals", () => {
  appendDetailDialog(root, readyStateFixture, "2026-08-12", onClose);
  expect(root.textContent).toContain("Wednesday, 12 August 2026");
  expect(root.textContent).toContain("Closed today: Breakfast, brunch");
  expect(root.textContent).toContain("Not confirmed: Dinner");
  expect(root.textContent).toContain("Access");
  expect(root.textContent).toContain("Price not publicly confirmed");
  expect(root.querySelectorAll(".evidence-link").length).toBeGreaterThan(0);
});

it("rejects an unknown college query and preserves unrelated parameters", () => {
  const location = new URL("https://example.test/?date=2026-08-12&college=not-a-college");
  expect(collegeFromLocation(location)).toBeNull();
  expect(urlWithCollege(location, "churchill").searchParams.get("date")).toBe("2026-08-12");
});
```

- [x] **Step 2: Run new dialog/query tests and verify RED**

Run: `npm test -- tests/ui/detail-dialog.test.ts tests/ui/query-state.test.ts tests/ui/mount.test.ts`

Expected: FAIL because the modules do not exist.

- [x] **Step 3: Implement safe mandatory detail rendering**

Available meals get full sections with time, every menu representation, notes, restrictions, and evidence links. Closed meals appear in one summary; unknown meals appear in a separate summary. Render access explanation, guest/payment rules, source-labelled prices/as-of dates, term label, freshness/timestamps/warnings, notices, and all sources. Use `textContent`/created nodes only. Render only HTTPS links; menu images use `alt`, PDFs/links open separately, and long item lists use native `<details>`.

- [x] **Step 4: Add key-free Maps links and embed**

Build `https://www.google.com/maps/search/?api=1&query=<encoded query>` for the title link and `https://www.google.com/maps?q=<encoded query>&output=embed` for an iframe with title `<College> dining location map`, `loading="lazy"`, and a restrictive `referrerPolicy`.

- [x] **Step 5: Implement modal behavior and history synchronization**

Use `<dialog>` with `showModal()` where available and a tested fallback attribute in jsdom. Set `aria-labelledby`, provide an explicit close button, close on Escape, keep Tab/Shift+Tab within focusable elements, make the background inert while open, and restore the originating row button. Opening pushes `?college=<id>`; closing pushes a URL without only that parameter; `popstate` opens/closes without creating a new history entry.

- [x] **Step 6: Run all UI and type tests**

Run: `npm test -- tests/ui && npm run typecheck`

Expected: PASS.

- [x] **Step 7: Commit the detail workflow**

```bash
git add src/ui tests/ui
git commit -m "feat: add accessible college dining details"
```

### Task 9: Sources and Methodology view, page-load counter, and responsive styling

**Files:**
- Create: `src/ui/methodology.ts`
- Create: `src/ui/counter.ts`
- Modify: `src/ui/render.ts`
- Modify: `src/ui/mount.ts`
- Modify: `src/styles.css`
- Modify: `index.html`
- Create: `tests/ui/methodology.test.ts`
- Create: `tests/ui/counter.test.ts`
- Modify: `tests/ui/render.test.ts`

**Interfaces:**
- Consumes: `COLLEGES`, snapshot collection metadata, and safe HTTPS source rendering.
- Produces: a functional `?view=sources` methodology view, a non-blocking hits.sh counter, and responsive table/dialog presentation.

- [x] **Step 1: Write sources-view and counter-failure tests**

```ts
it("lists all 31 college source groups and all four evidence definitions", () => {
  appendMethodology(root, snapshotFixture);
  expect(root.querySelectorAll("[data-source-college]")).toHaveLength(31);
  for (const label of ["Official college", "Official University", "Official student body", "Supplementary, not official"]) {
    expect(root.textContent).toContain(label);
  }
});

it("leaves the application usable when the page counter image fails", () => {
  root.append(document.createElement("table"));
  appendPageCounter(root);
  root.querySelector<HTMLImageElement>(".page-counter img")!.dispatchEvent(new Event("error"));
  expect(root.textContent).toContain("Page-load count unavailable");
  expect(root.querySelector("table")).not.toBeNull();
});
```

- [x] **Step 2: Run methodology/counter tests and verify RED**

Run: `npm test -- tests/ui/methodology.test.ts tests/ui/counter.test.ts`

Expected: FAIL because the modules do not exist.

- [x] **Step 3: Implement the secondary view and counter isolation**

The methodology view lists catalog sources and evidence labels and explains live/scheduled/cached freshness, derived term dates, dated material, supplementary evidence, access/price change risk, and source verification. Navigation between directory and sources uses real links with `?view=sources` and `?view=directory`. The hits.sh image URL is HTTPS, is labelled `Page loads`, and replaces itself with `Page-load count unavailable` on error without touching application state.

- [x] **Step 4: Replace v1 card CSS with responsive table/drawer CSS**

Use visible focus rings, colour plus text/status labels, minimum 44px primary controls, sticky table header, horizontal overflow containment, desktop right-side dialog, and mobile full-viewport dialog. At `max-width: 720px`, hide only columns tagged `.optional-column`; college, services, and access remain visible. Respect `prefers-reduced-motion: reduce` and preserve readable content with CSS disabled.

- [x] **Step 5: Run UI tests, type checking, and build**

Run: `npm test -- tests/ui && npm run typecheck && npm run build`

Expected: PASS.

- [x] **Step 6: Commit presentation and methodology**

```bash
git add src/ui src/styles.css index.html tests/ui
git commit -m "feat: add sources view and responsive directory"
```

### Task 10: Daily link-safe collector and last-good carry-forward

**Files:**
- Create: `scripts/collect-dining.mjs`
- Create: `scripts/collector/catalog.mjs`
- Create: `scripts/collector/validate.mjs`
- Create: `scripts/collector/merge.mjs`
- Create: `tests/collector/validate.test.ts`
- Create: `tests/collector/merge.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: checked-in `public/data/college-dining.json`, the 27 scheduled source URLs, ordinary public Fetch, and no secrets.
- Produces: `npm run collect`, `validateSnapshot(value)`, and `mergeCollection(previous, attempts, collectedAt)`.

- [x] **Step 1: Write collector validation and carry-forward tests**

```ts
it("carries a failed college forward without changing its timestamp", () => {
  const merged = mergeCollection(previous, new Map([["newnham", { ok: false, warning: "HTTP 503" }]]), now);
  expect(merged.colleges.newnham.collectedAt).toBe(previous.colleges.newnham.collectedAt);
  expect(merged.colleges.newnham.warning).toContain("HTTP 503");
});

it("rejects an empty successful parse so it cannot replace good menu data", () => {
  expect(() => validateCollegeAttempt({ college: "wolfson", coverage: "menu", mealsByDate: {} })).toThrow(/menu coverage/);
});
```

- [x] **Step 2: Run collector tests and verify RED**

Run: `npm test -- tests/collector`

Expected: FAIL because collector modules do not exist.

- [x] **Step 3: Implement bounded polite collection**

For each scheduled college, validate the primary HTTPS link with GET, a descriptive user agent, redirect following, a 15-second abort timeout, and at most two concurrent requests. Do not send credentials or bypass protection. Keep the checked-in structured record when the source is merely link-validated. Promote a record only through an explicit college parser that returns non-empty evidence; the initial release can safely retain link-only records.

Set `allowJs: true` in `tsconfig.json` and include `scripts` so Vitest and type checking can import the `.mjs` collector modules without untracked declarations; keep `checkJs: false` because runtime shape validation is exercised by the collector tests.

- [x] **Step 4: Implement atomic all-college validation and last-good merge**

Read the prior JSON, validate it, apply successful records, carry failures with original `collectedAt`, add a warning, validate the complete result, then write the requested output path. CLI arguments are `--previous <path>` and `--output <path>`; invalid arguments exit non-zero. `npm run collect` writes `public/data/college-dining.json` for local inspection.

- [x] **Step 5: Run collector tests and a temporary collection**

Run: `npm test -- tests/collector && node scripts/collect-dining.mjs --previous public/data/college-dining.json --output /tmp/college-dining.json`

Expected: tests PASS; the command either refreshes link validation or carries individual records forward, and produces a schema-valid 27-college file.

- [x] **Step 6: Commit the collector**

```bash
git add scripts package.json tsconfig.json tests/collector
git commit -m "feat: add safe daily dining collector"
```

### Task 11: GitHub Actions collection, deployment, and live smoke coverage

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `scripts/live-smoke.mjs`
- Create: `scripts/validate-built-data.mjs`
- Modify: `package.json`
- Test: `tests/release/workflow.test.ts`
- Test: `tests/release/build-data.test.ts`

**Interfaces:**
- Consumes: collector CLI, schema validator, four direct endpoint definitions, and Vite `dist`.
- Produces: daily/manual/push deployment, `npm run smoke:live`, `npm run validate:dist`, and an expanded `npm run verify`.

- [x] **Step 1: Write release tests for schedule, collection order, and built data**

```ts
it("collects before verification and deploys on a daily schedule", () => {
  const workflow = readFileSync(".github/workflows/pages.yml", "utf8");
  expect(workflow).toContain("schedule:");
  expect(workflow).toContain("cron: '17 5 * * *'");
  expect(workflow.indexOf("npm run collect")).toBeLessThan(workflow.indexOf("npm run verify"));
});

it("ships one schema-valid scheduled record for each of the 27 colleges", () => {
  const snapshot = parseScheduledSnapshot(JSON.parse(readFileSync("public/data/college-dining.json", "utf8")));
  expect(Object.keys(snapshot.colleges)).toHaveLength(27);
});
```

- [x] **Step 2: Run release tests and verify RED**

Run: `npm test -- tests/release`

Expected: FAIL because there is no daily schedule or dist validator.

- [x] **Step 3: Update the deployment workflow**

Add `schedule: [{ cron: '17 5 * * *' }]`. In the build job run `npm ci`, `npm run collect`, `npm run verify`, and `npm run validate:dist` before upload. Keep `contents: read`, Pages write permissions, deployment concurrency, and no commit/push step. Collection failure should still yield a valid merged file through per-college carry-forward; a total invalid output stops deployment.

- [x] **Step 4: Expand live smoke checks conservatively**

Check the four direct entry points and a bounded sample of scheduled primary URLs with clear college labels, timeouts, and no parallel flood. A blocked scheduled source reports its status for release review but does not imply a parsed menu. The script exits non-zero for a direct endpoint structural failure.

- [x] **Step 5: Run release tests, full verification, and live smoke**

Run: `npm test -- tests/release && npm run verify && npm run validate:dist && npm run smoke:live`

Expected: all automated checks PASS; live smoke prints the four direct sources and the bounded scheduled sample with no uncaught rejection.

- [x] **Step 6: Commit release automation**

```bash
git add .github/workflows/pages.yml scripts package.json tests/release
git commit -m "ci: collect and deploy daily dining data"
```

### Task 12: Documentation, accessibility inspection, release audit, and deployment

**Files:**
- Modify: `README.md`
- Create: `docs/source-audit-2026-08-12.md`
- Modify: `docs/superpowers/plans/2026-08-12-all-college-directory.md`

**Interfaces:**
- Consumes: complete application, collector output, live smoke report, main and archive GitHub Pages URLs.
- Produces: reproducible contributor instructions, a 31-source audit ledger, checked plan boxes, and verified public deployment.

- [x] **Step 1: Document actual operation and claim boundaries**

README must include Node floor, `npm ci`, `npm run dev`, `npm run collect`, `npm run verify`, source architecture, freshness meanings, cache behavior, GitHub Pages deployment, source-repair procedure, and archive URL. The audit ledger has one row per college with primary URL, evidence kind, retrieval level, last check result, and limitation.

- [x] **Step 2: Run the complete local release gate from a clean dependency state**

Run: `npm ci && npm run collect && npm run verify && npm run validate:dist && npm run smoke:live && git diff --check`

Expected: dependency install succeeds; tests, type checking, build, schema validation, and live smoke pass; no whitespace errors.

- [x] **Step 3: Inspect keyboard, mobile, and reduced-motion behavior**

Serve `dist` beneath the same relative-path behavior as GitHub Pages. Verify: 31 initial rows; date controls; search/four filters/sort; row keyboard activation; drawer title and mandatory fields; Tab/Shift+Tab containment; Escape; focus restoration; deep link; Back/Forward; 720px mobile layout; 320px overflow; reduced motion; and readable loading/error/cached states. Record results in the audit ledger.

- [x] **Step 4: Verify all source groups and archive invariance**

For each catalog record, verify at least one source resolves or document its current failure without promoting evidence. Compare representative direct results with the official page. Request `https://sagarnidhish.github.io/cambridge-college-dining_old/` before and after deployment and record that it remains available and visually unchanged.

- [x] **Step 5: Commit documentation and completed plan checkboxes**

```bash
git add README.md docs/source-audit-2026-08-12.md docs/superpowers/plans/2026-08-12-all-college-directory.md
git commit -m "docs: document all-college dining release"
```

- [x] **Step 6: Push main and watch the Pages workflow**

Run: `git push origin main`

Then run: `gh run list --workflow pages.yml --limit 1` and `gh run watch <run-id> --exit-status`.

Expected: push succeeds and the latest Pages workflow completes successfully.

- [x] **Step 7: Verify the deployed product**

Open `https://sagarnidhish.github.io/cambridge-college-dining/`, confirm exactly 31 table rows and one working detail deep link, then recheck `https://sagarnidhish.github.io/cambridge-college-dining_old/`.

Expected: the main site serves the new directory, direct and scheduled states are honestly labelled, source links are present, and the archive still serves the original release.
