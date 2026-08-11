// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createUnknownDiningDay } from "../../src/domain/meals";
import { createDashboardSession } from "../../src/app/dashboard-session";
import { CHURCHILL_API, ST_EDMUNDS_CATERING_API, ST_EDMUNDS_POSTS_API } from "../../src/sources/fetch";
import { CHURCHILL_PAGE_FIXTURE } from "../fixtures/churchill";
import { ST_EDMUNDS_CATERING_FIXTURE, ST_EDMUNDS_POST_FIXTURES } from "../fixtures/st-edmunds";

const selectedDate = "2026-08-11" as const;

type FetchCall = { url: string; init: RequestInit | undefined };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

type FetchResult = Response | Error | (() => Response);

function fetchWith(responses: Record<string, FetchResult>, calls: FetchCall[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const response = responses[url];
    if (response instanceof Error) {
      throw response;
    }
    if (response === undefined) {
      throw new Error(`Unexpected request: ${url}`);
    }
    return typeof response === "function" ? response() : response;
  }) as typeof fetch;
}

function successfulResponses(): Record<string, () => Response> {
  return {
    [CHURCHILL_API]: () => jsonResponse(CHURCHILL_PAGE_FIXTURE),
    [ST_EDMUNDS_POSTS_API]: () => jsonResponse(ST_EDMUNDS_POST_FIXTURES),
    [ST_EDMUNDS_CATERING_API]: () => jsonResponse(ST_EDMUNDS_CATERING_FIXTURE)
  };
}

function makeSession(fetchImpl: typeof fetch) {
  return createDashboardSession({
    fetchImpl,
    storage: localStorage,
    now: () => new Date("2026-08-11T21:35:00.000Z")
  });
}

afterEach(() => localStorage.clear());

describe("DashboardSession", () => {
  it("uses cache-disabled JSON requests for every official endpoint", async () => {
    const calls: FetchCall[] = [];
    const state = await makeSession(fetchWith(successfulResponses(), calls)).refresh(selectedDate);

    expect(state.colleges.churchill.status).toBe("ready");
    expect(state.colleges["st-edmunds"].status).toBe("ready");
    expect(calls.map((call) => call.url).sort()).toEqual([CHURCHILL_API, ST_EDMUNDS_CATERING_API, ST_EDMUNDS_POSTS_API].sort());
    for (const call of calls) {
      expect(call.init).toMatchObject({ cache: "no-store", headers: { Accept: "application/json" } });
    }
  });

  it("starts both colleges without waiting for either source to settle", async () => {
    const calls: FetchCall[] = [];
    const pending = new Map<string, (response: Response) => void>();
    const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return new Promise<Response>((resolve) => pending.set(url, resolve));
    }) as typeof fetch;
    const refresh = makeSession(fetchImpl).refresh(selectedDate);

    expect(calls.map((call) => call.url).sort()).toEqual([CHURCHILL_API, ST_EDMUNDS_CATERING_API, ST_EDMUNDS_POSTS_API].sort());
    pending.get(ST_EDMUNDS_POSTS_API)?.(jsonResponse(ST_EDMUNDS_POST_FIXTURES));
    pending.get(ST_EDMUNDS_CATERING_API)?.(jsonResponse(ST_EDMUNDS_CATERING_FIXTURE));
    pending.get(CHURCHILL_API)?.(jsonResponse(CHURCHILL_PAGE_FIXTURE));

    const state = await refresh;
    expect(state.colleges.churchill.status).toBe("ready");
    expect(state.colleges["st-edmunds"].status).toBe("ready");
  });

  it("keeps live St Edmund's data when Churchill fails", async () => {
    const calls: FetchCall[] = [];
    const state = await makeSession(fetchWith({
      ...successfulResponses(),
      [CHURCHILL_API]: new Error("Churchill unavailable")
    }, calls)).refresh(selectedDate);

    expect(state.colleges.churchill).toMatchObject({ status: "error", college: "churchill" });
    expect(state.colleges["st-edmunds"]).toMatchObject({ status: "ready", day: { college: "st-edmunds", freshness: "live" } });
  });

  it("uses both authoritative St Edmund's links for a terminal no-cache error", async () => {
    const state = await makeSession(fetchWith({
      ...successfulResponses(),
      [ST_EDMUNDS_POSTS_API]: new Error("weekly archive unavailable")
    }, [])).refresh(selectedDate);

    expect(state.colleges["st-edmunds"]).toMatchObject({
      status: "error",
      sourceLinks: [
        { label: "St Edmund's menu archive", url: "https://my.st-edmunds.cam.ac.uk/category/menus/" },
        { label: "St Edmund's catering", url: "https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/" }
      ]
    });
  });

  it("uses the exact-date Churchill cache as stale data after a Churchill failure", async () => {
    const cached = createUnknownDiningDay({
      college: "churchill",
      collegeName: "Churchill College",
      date: selectedDate,
      sourceLinks: [{ label: "View official source", url: "https://www.chu.cam.ac.uk/" }],
      fetchedAt: "2026-08-10T20:00:00.000Z"
    });
    localStorage.setItem("college-dining:v1:churchill:2026-08-11", JSON.stringify({ version: 1, college: "churchill", date: selectedDate, day: cached }));
    const state = await makeSession(fetchWith({
      ...successfulResponses(),
      [CHURCHILL_API]: new Error("Churchill unavailable")
    }, [])).refresh(selectedDate);

    expect(state.colleges.churchill).toMatchObject({
      status: "ready",
      day: { freshness: "stale", fetchedAt: "2026-08-10T20:00:00.000Z" }
    });
  });

  it("uses the cached Churchill day when a later explicit refresh fails", async () => {
    let churchillRequests = 0;
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === CHURCHILL_API) {
        churchillRequests += 1;
        if (churchillRequests === 2) {
          throw new Error("Churchill unavailable");
        }
        return jsonResponse(CHURCHILL_PAGE_FIXTURE);
      }
      if (url === ST_EDMUNDS_POSTS_API) {
        return jsonResponse(ST_EDMUNDS_POST_FIXTURES);
      }
      if (url === ST_EDMUNDS_CATERING_API) {
        return jsonResponse(ST_EDMUNDS_CATERING_FIXTURE);
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
    const session = makeSession(fetchImpl);

    const initial = await session.refresh(selectedDate);
    const refreshed = await session.refresh(selectedDate);

    expect(initial.colleges.churchill).toMatchObject({
      status: "ready",
      day: { freshness: "live", fetchedAt: "2026-08-11T21:35:00.000Z" }
    });
    expect(refreshed.colleges.churchill).toMatchObject({
      status: "ready",
      day: { freshness: "stale", fetchedAt: "2026-08-11T21:35:00.000Z" }
    });
  });

  it("does not substitute a different-date cache after a Churchill failure", async () => {
    const cached = createUnknownDiningDay({
      college: "churchill",
      collegeName: "Churchill College",
      date: "2026-08-10",
      sourceLinks: [{ label: "View official source", url: "https://www.chu.cam.ac.uk/" }],
      fetchedAt: "2026-08-10T20:00:00.000Z"
    });
    localStorage.setItem("college-dining:v1:churchill:2026-08-10", JSON.stringify({ version: 1, college: "churchill", date: "2026-08-10", day: cached }));
    const state = await makeSession(fetchWith({
      ...successfulResponses(),
      [CHURCHILL_API]: new Error("Churchill unavailable")
    }, [])).refresh(selectedDate);

    expect(state.colleges.churchill).toMatchObject({ status: "error", college: "churchill" });
  });

  it("re-parses retained live snapshots when selecting another date without HTTP", async () => {
    const calls: FetchCall[] = [];
    const session = makeSession(fetchWith(successfulResponses(), calls));
    await session.refresh(selectedDate);

    const state = session.selectDate("2026-08-12");

    expect(calls).toHaveLength(3);
    expect(state).toMatchObject({
      selectedDate: "2026-08-12",
      colleges: {
        churchill: { status: "ready", day: { date: "2026-08-12", freshness: "live" } },
        "st-edmunds": { status: "ready", day: { date: "2026-08-12", freshness: "live" } }
      }
    });
  });

  it("performs new HTTP requests on a later refresh", async () => {
    const calls: FetchCall[] = [];
    const session = makeSession(fetchWith(successfulResponses(), calls));
    await session.refresh(selectedDate);
    await session.refresh("2026-08-12");

    expect(calls).toHaveLength(6);
  });

  it("keeps the newest same-date refresh snapshots and cache when an older refresh resolves last", async () => {
    const pending: Array<(response: Response) => void> = [];
    const fetchImpl = ((input: RequestInfo | URL) => new Promise<Response>((resolve) => {
      pending.push(resolve);
    })) as typeof fetch;
    const session = makeSession(fetchImpl);

    const older = session.refresh(selectedDate);
    const newer = session.refresh(selectedDate);
    const newerPayloads = [CHURCHILL_PAGE_FIXTURE, ST_EDMUNDS_POST_FIXTURES, ST_EDMUNDS_CATERING_FIXTURE];
    const olderChurchill = {
      ...CHURCHILL_PAGE_FIXTURE,
      modified: "2026-08-01T00:00:00",
      content: {
        ...CHURCHILL_PAGE_FIXTURE.content,
        rendered: CHURCHILL_PAGE_FIXTURE.content.rendered.replace("Churchill Trattoria", "Older Churchill Menu")
      }
    };
    const olderPayloads = [olderChurchill, ST_EDMUNDS_POST_FIXTURES, ST_EDMUNDS_CATERING_FIXTURE];

    pending.slice(3, 6).forEach((resolve, index) => resolve(jsonResponse(newerPayloads[index])));
    await newer;
    pending.slice(0, 3).forEach((resolve, index) => resolve(jsonResponse(olderPayloads[index])));
    await older;

    const selected = session.selectDate(selectedDate);
    const churchill = selected.colleges.churchill;
    expect(churchill).toMatchObject({ status: "ready", day: { sourceModifiedAt: CHURCHILL_PAGE_FIXTURE.modified } });
    expect(churchill.status === "ready" && churchill.day.meals.lunch.menu).not.toEqual({ kind: "items", items: expect.arrayContaining(["Today's Special: Older Churchill Menu"]) });
  });

  it("does not let an older failed refresh displace a newer successful snapshot", async () => {
    const pending: Array<(result: Response | Error) => void> = [];
    const fetchImpl = ((input: RequestInfo | URL) => new Promise<Response>((resolve, reject) => {
      pending.push((result) => result instanceof Error ? reject(result) : resolve(result));
    })) as typeof fetch;
    const session = makeSession(fetchImpl);

    const older = session.refresh(selectedDate);
    const newer = session.refresh(selectedDate);
    pending.slice(3, 6).forEach((resolve, index) => resolve(jsonResponse([CHURCHILL_PAGE_FIXTURE, ST_EDMUNDS_POST_FIXTURES, ST_EDMUNDS_CATERING_FIXTURE][index])));
    await newer;
    pending.slice(0, 3).forEach((resolve) => resolve(new Error("older request failed")));
    await older;

    expect(session.selectDate(selectedDate).colleges.churchill).toMatchObject({ status: "ready", day: { freshness: "live" } });
  });

  it("keeps a valid exact-date cache when semantic source drift makes St Edmund's schedule incomplete", async () => {
    const session = makeSession(fetchWith(successfulResponses(), []));
    await session.refresh(selectedDate);
    const invalidCatering = {
      ...ST_EDMUNDS_CATERING_FIXTURE,
      content: { protected: false, rendered: "<table><tr><td>Monday–Friday</td><td>Lunch</td><td>midday</td></tr></table>" }
    };
    const drifted = await makeSession(fetchWith({
      [CHURCHILL_API]: () => jsonResponse(CHURCHILL_PAGE_FIXTURE),
      [ST_EDMUNDS_POSTS_API]: () => jsonResponse(ST_EDMUNDS_POST_FIXTURES),
      [ST_EDMUNDS_CATERING_API]: () => jsonResponse(invalidCatering)
    }, [])).refresh(selectedDate);

    expect(drifted.colleges["st-edmunds"]).toMatchObject({ status: "ready", day: { freshness: "stale", fetchedAt: "2026-08-11T21:35:00.000Z" } });
  });

  it("does not replace an exact-date cache when St Edmund's timetable has no recognized services", async () => {
    const session = makeSession(fetchWith(successfulResponses(), []));
    await session.refresh(selectedDate);
    const unrecognizedCatering = {
      ...ST_EDMUNDS_CATERING_FIXTURE,
      content: { protected: false, rendered: "<table><tr><td>Dining hall</td><td>Monday–Friday</td><td>Contact catering</td></tr></table>" }
    };
    const drifted = await makeSession(fetchWith({
      [CHURCHILL_API]: () => jsonResponse(CHURCHILL_PAGE_FIXTURE),
      [ST_EDMUNDS_POSTS_API]: () => jsonResponse(ST_EDMUNDS_POST_FIXTURES),
      [ST_EDMUNDS_CATERING_API]: () => jsonResponse(unrecognizedCatering)
    }, [])).refresh(selectedDate);

    expect(drifted.colleges["st-edmunds"]).toMatchObject({ status: "ready", day: { freshness: "stale", fetchedAt: "2026-08-11T21:35:00.000Z" } });
  });

  it("timestamps each college when its source snapshot settles", async () => {
    let resolveChurchill: ((response: Response) => void) | undefined;
    const fetchImpl = ((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === CHURCHILL_API) {
        return new Promise<Response>((resolve) => { resolveChurchill = resolve; });
      }
      if (url === ST_EDMUNDS_POSTS_API) return Promise.resolve(jsonResponse(ST_EDMUNDS_POST_FIXTURES));
      if (url === ST_EDMUNDS_CATERING_API) return Promise.resolve(jsonResponse(ST_EDMUNDS_CATERING_FIXTURE));
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
    const times = [new Date("2026-08-11T21:35:01.000Z"), new Date("2026-08-11T21:35:02.000Z")];
    const session = createDashboardSession({ fetchImpl, storage: localStorage, now: () => times.shift()! });
    const refresh = session.refresh(selectedDate);

    await Promise.resolve();
    await Promise.resolve();
    resolveChurchill?.(jsonResponse(CHURCHILL_PAGE_FIXTURE));
    const state = await refresh;

    expect(state.colleges["st-edmunds"]).toMatchObject({ status: "ready", day: { fetchedAt: "2026-08-11T21:35:01.000Z" } });
    expect(state.colleges.churchill).toMatchObject({ status: "ready", day: { fetchedAt: "2026-08-11T21:35:02.000Z" } });
  });
});
