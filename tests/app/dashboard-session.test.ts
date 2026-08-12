// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createDashboardSession } from "../../src/app/dashboard-session";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import { saveCachedDay } from "../../src/storage/cache";
import {
  CHURCHILL_API,
  DARWIN_MENUS_API,
  DOWNING_BASE_API,
  SCHEDULED_SNAPSHOT_URL,
  ST_EDMUNDS_CATERING_API,
  ST_EDMUNDS_POSTS_API,
  downingSearchApi
} from "../../src/sources/fetch";
import { CHURCHILL_PAGE_FIXTURE } from "../fixtures/churchill";
import { DARWIN_MENU_FIXTURE } from "../fixtures/darwin";
import { DOWNING_BASE_FIXTURE, DOWNING_SEARCH_FIXTURE } from "../fixtures/downing";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";
import { ST_EDMUNDS_CATERING_FIXTURE, ST_EDMUNDS_POST_FIXTURES } from "../fixtures/st-edmunds";

const selectedDate = "2026-08-12" as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function successfulResponse(url: string): Response {
  if (url === CHURCHILL_API) return jsonResponse(CHURCHILL_PAGE_FIXTURE);
  if (url === ST_EDMUNDS_POSTS_API) return jsonResponse(ST_EDMUNDS_POST_FIXTURES);
  if (url === ST_EDMUNDS_CATERING_API) return jsonResponse(ST_EDMUNDS_CATERING_FIXTURE);
  if (url === DARWIN_MENUS_API) return jsonResponse(DARWIN_MENU_FIXTURE);
  if (url === DOWNING_BASE_API) return jsonResponse(DOWNING_BASE_FIXTURE);
  if (url === downingSearchApi(4095)) return jsonResponse(DOWNING_SEARCH_FIXTURE);
  if (url === SCHEDULED_SNAPSHOT_URL) return jsonResponse(scheduledSnapshotFixture());
  throw new Error(`Unexpected request: ${url}`);
}

function makeFetch(overrides: Record<string, Error | Response> = {}, calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const override = overrides[url];
    if (override instanceof Error) throw override;
    return override ?? successfulResponse(url);
  }) as typeof fetch;
}

function makeSession(fetchImpl: typeof fetch) {
  return createDashboardSession({
    fetchImpl,
    storage: localStorage,
    now: () => new Date("2026-08-12T08:00:00.000Z")
  });
}

afterEach(() => localStorage.clear());

describe("DashboardSession", () => {
  it("returns exactly 31 independent states from four direct sources and one scheduled snapshot", async () => {
    const calls: string[] = [];
    const state = await makeSession(makeFetch({}, calls)).refresh(selectedDate);

    expect(Object.keys(state.colleges)).toHaveLength(31);
    expect(state.colleges.churchill).toMatchObject({ status: "ready", day: { freshness: "live" } });
    expect(state.colleges.darwin).toMatchObject({ status: "ready", day: { freshness: "live" } });
    expect(state.colleges.downing).toMatchObject({ status: "ready", day: { freshness: "live" } });
    expect(state.colleges["st-edmunds"]).toMatchObject({ status: "ready", day: { freshness: "live" } });
    expect(state.colleges.newnham).toMatchObject({ status: "ready", day: { freshness: "scheduled" } });
    expect(calls).toEqual(expect.arrayContaining([CHURCHILL_API, DARWIN_MENUS_API, DOWNING_BASE_API, SCHEDULED_SNAPSHOT_URL]));
  });

  it("keeps the other 30 usable when one direct source rejects", async () => {
    const state = await makeSession(makeFetch({ [CHURCHILL_API]: new Error("offline") })).refresh(selectedDate);

    expect(state.colleges.churchill).toMatchObject({ status: "error", college: "churchill" });
    expect(state.colleges.darwin!.status).toBe("ready");
    expect(state.colleges.newnham!.status).toBe("ready");
    expect(Object.values(state.colleges).filter(({ status }) => status === "ready")).toHaveLength(30);
  });

  it("uses exact-date cache after a failed explicit refresh without rewriting its timestamp", async () => {
    let churchillRequests = 0;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === CHURCHILL_API && ++churchillRequests === 2) throw new Error("offline");
      return successfulResponse(url);
    }) as typeof fetch;
    const session = makeSession(fetchImpl);

    const first = await session.refresh(selectedDate);
    const second = await session.refresh(selectedDate);

    expect(first.colleges.churchill).toMatchObject({ status: "ready", day: { freshness: "live", fetchedAt: "2026-08-12T08:00:00.000Z" } });
    expect(second.colleges.churchill).toMatchObject({ status: "ready", day: { freshness: "cached", fetchedAt: "2026-08-12T08:00:00.000Z" } });
  });

  it("does not use a different-date cache", async () => {
    saveCachedDay(localStorage, unknownDiningDay(collegeById("churchill"), "2026-08-11", "2026-08-11T08:00:00.000Z", "live"));
    const state = await makeSession(makeFetch({ [CHURCHILL_API]: new Error("offline") })).refresh(selectedDate);
    expect(state.colleges.churchill.status).toBe("error");
  });

  it("isolates an invalid scheduled payload from all four direct results", async () => {
    const state = await makeSession(makeFetch({ [SCHEDULED_SNAPSHOT_URL]: jsonResponse({ schemaVersion: 2, colleges: {} }) })).refresh(selectedDate);
    expect(state.colleges.churchill.status).toBe("ready");
    expect(state.colleges.darwin!.status).toBe("ready");
    expect(state.colleges.newnham).toMatchObject({ status: "error", college: "newnham" });
    expect(Object.values(state.colleges).filter(({ status }) => status === "error")).toHaveLength(27);
  });

  it("re-parses retained direct and scheduled snapshots for another date without HTTP", async () => {
    const calls: string[] = [];
    const session = makeSession(makeFetch({}, calls));
    await session.refresh(selectedDate);
    const requestCount = calls.length;

    const state = session.selectDate("2026-08-13");

    expect(calls).toHaveLength(requestCount);
    expect(Object.keys(state.colleges)).toHaveLength(31);
    expect(state.colleges.darwin).toMatchObject({ status: "ready", day: { date: "2026-08-13", freshness: "live" } });
    expect(state.colleges.newnham).toMatchObject({ status: "ready", day: { date: "2026-08-13", freshness: "scheduled" } });
  });

  it("preserves a newer successful snapshot when an older refresh fails later", async () => {
    const pendingChurchill: Array<{ resolve(response: Response): void; reject(error: Error): void }> = [];
    const fetchImpl = ((input: RequestInfo | URL) => {
      const url = String(input);
      if (url !== CHURCHILL_API) return Promise.resolve(successfulResponse(url));
      return new Promise<Response>((resolve, reject) => pendingChurchill.push({ resolve, reject }));
    }) as typeof fetch;
    const session = makeSession(fetchImpl);
    const older = session.refresh(selectedDate);
    const newer = session.refresh(selectedDate);

    pendingChurchill[1]!.resolve(jsonResponse(CHURCHILL_PAGE_FIXTURE));
    await newer;
    pendingChurchill[0]!.reject(new Error("old failure"));
    await older;

    expect(session.selectDate(selectedDate).colleges.churchill).toMatchObject({ status: "ready", day: { freshness: "live" } });
  });
});
