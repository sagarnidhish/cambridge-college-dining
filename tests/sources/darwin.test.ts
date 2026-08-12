import { describe, expect, it, vi } from "vitest";
import { DARWIN_MENUS_API, fetchDarwinSnapshot } from "../../src/sources/fetch";
import { parseDarwinDay } from "../../src/sources/darwin";
import { DARWIN_MENU_FIXTURE } from "../fixtures/darwin";

describe("Darwin live source", () => {
  it("keeps published recurring service separate from unavailable structured dish content", () => {
    const day = parseDarwinDay({ menus: DARWIN_MENU_FIXTURE }, "2026-08-12", "2026-08-12T08:00:00.000Z");
    expect(day).toMatchObject({
      college: "darwin",
      freshness: "live",
      coverage: "schedule",
      access: { classification: "guest-required" },
      sourceModifiedAt: "2026-08-11T12:53:50"
    });
    expect(day.meals.lunch).toMatchObject({ availability: "unknown", time: "Normally 12:00–14:00" });
    expect(day.meals.dinner).toMatchObject({ availability: "unknown", time: "Normally 18:00–19:00" });
    expect(day.meals.lunch.menu).toEqual([{ kind: "link", label: "Open Darwin's current weekly menu", url: "https://www.darwin.cam.ac.uk/dine/weekly-menu/" }]);
    expect(day.notices.join(" ")).toMatch(/menu details are published on Darwin's official weekly-menu page/i);
  });

  it("uses brunch hours at weekends without claiming current availability", () => {
    const day = parseDarwinDay({ menus: DARWIN_MENU_FIXTURE }, "2026-08-15", "2026-08-12T08:00:00.000Z");
    expect(day.meals.brunch).toMatchObject({ availability: "unknown", time: "Normally 10:00–14:00" });
    expect(day.meals.lunch.time).toBe("Time not published");
  });

  it("rejects an empty menu collection as structural drift", () => {
    expect(() => parseDarwinDay({ menus: [] }, "2026-08-12", "2026-08-12T08:00:00.000Z"))
      .toThrow(/Darwin menu collection/);
  });

  it("fetches the official CORS-enabled menu collection without browser caching", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(DARWIN_MENU_FIXTURE), { status: 200 })) as unknown as typeof fetch;
    await expect(fetchDarwinSnapshot(fetchImpl)).resolves.toEqual({ menus: DARWIN_MENU_FIXTURE });
    expect(fetchImpl).toHaveBeenCalledWith(DARWIN_MENUS_API, expect.objectContaining({ cache: "no-store" }));
  });
});
