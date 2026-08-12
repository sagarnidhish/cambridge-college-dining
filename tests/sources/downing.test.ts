import { describe, expect, it, vi } from "vitest";
import { DOWNING_BASE_API, downingSearchApi, fetchDowningSnapshot } from "../../src/sources/fetch";
import { parseDowningDay } from "../../src/sources/downing";
import { DOWNING_BASE_FIXTURE, DOWNING_SEARCH_FIXTURE } from "../fixtures/downing";

describe("Downing live source", () => {
  it("maps the matching weekday menu, restrictions, prices, and access evidence", () => {
    const day = parseDowningDay({ base: DOWNING_BASE_FIXTURE, menu: DOWNING_SEARCH_FIXTURE }, "2026-08-12", "2026-08-12T08:00:00.000Z");
    expect(day).toMatchObject({
      college: "downing",
      freshness: "live",
      coverage: "menu",
      access: { classification: "unknown" }
    });
    expect(day.meals.lunch.availability).toBe("available");
    expect(day.meals.lunch.menu[0]).toMatchObject({ kind: "items", items: ["Honey glazed bacon loin — £3.50", "Vegetable gyoza — £3.40"] });
    expect(day.meals.lunch.restrictions).toEqual(expect.arrayContaining(["Contains: Gluten", "Contains: Milk", "Contains Pork", "Suitable for Vegan diet"]));
    expect(day.prices).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: "£3.40–£3.50", precision: "exact", audience: "Published student food prices" })
    ]));
  });

  it("does not attach a menu whose weekday does not include the selected date", () => {
    const day = parseDowningDay({ base: DOWNING_BASE_FIXTURE, menu: DOWNING_SEARCH_FIXTURE }, "2026-08-14", "2026-08-12T08:00:00.000Z");
    expect(day.coverage).toBe("schedule");
    expect(day.meals.lunch.availability).toBe("unknown");
  });

  it("rejects a menu response without recognizable recipes", () => {
    expect(() => parseDowningDay({ base: DOWNING_BASE_FIXTURE, menu: { ...DOWNING_SEARCH_FIXTURE, menus: [] } }, "2026-08-12", "2026-08-12T08:00:00.000Z"))
      .toThrow(/Downing menu response/);
  });

  it("fetches the active official group using the public browser request", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === DOWNING_BASE_API) return new Response(JSON.stringify(DOWNING_BASE_FIXTURE), { status: 200 });
      if (url === downingSearchApi(4095)) return new Response(JSON.stringify(DOWNING_SEARCH_FIXTURE), { status: 200 });
      throw new Error(`Unexpected URL ${url}`);
    }) as unknown as typeof fetch;
    await expect(fetchDowningSnapshot(fetchImpl)).resolves.toEqual({ base: DOWNING_BASE_FIXTURE, menu: DOWNING_SEARCH_FIXTURE });
    expect(fetchImpl).toHaveBeenLastCalledWith(downingSearchApi(4095), expect.objectContaining({ method: "POST", body: "{}", cache: "no-store" }));
  });
});
