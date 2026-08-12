// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import { loadCachedDay, saveCachedDay } from "../../src/storage/cache";

const cacheKey = "college-dining:v2:churchill:2026-08-11";

function cachedDay() {
  return unknownDiningDay(collegeById("churchill"), "2026-08-11", "2026-08-11T20:00:00.000Z", "live");
}

afterEach(() => localStorage.clear());

describe("college-day cache", () => {
  it("returns only an exact-date cache entry and marks it cached", () => {
    const day = cachedDay();
    saveCachedDay(localStorage, day);

    expect(loadCachedDay(localStorage, "churchill", "2026-08-12")).toBeNull();
    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")?.freshness).toBe("cached");
  });

  it("rejects malformed JSON", () => {
    localStorage.setItem(cacheKey, "{not-json");

    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });

  it("rejects a wrong schema version", () => {
    localStorage.setItem(cacheKey, JSON.stringify({ version: 1, college: "churchill", date: "2026-08-11", day: cachedDay() }));

    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });

  it("rejects a college mismatch", () => {
    localStorage.setItem(cacheKey, JSON.stringify({ version: 2, college: "st-edmunds", date: "2026-08-11", day: cachedDay() }));

    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });

  it("rejects a record missing one of the four meal keys", () => {
    const day = cachedDay();
    const { dinner: _dinner, ...mealsWithoutDinner } = day.meals;
    localStorage.setItem(cacheKey, JSON.stringify({ version: 2, college: "churchill", date: "2026-08-11", day: { ...day, meals: mealsWithoutDinner } }));

    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });

  it("rejects a weekday that does not match the cached ISO date", () => {
    const day = { ...cachedDay(), weekday: "Wednesday" };
    localStorage.setItem(cacheKey, JSON.stringify({ version: 2, college: "churchill", date: "2026-08-11", day }));

    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });

  it("rejects invalid fetched or source-modification timestamps", () => {
    const invalidFetched = { ...cachedDay(), fetchedAt: "not-a-date" };
    localStorage.setItem(cacheKey, JSON.stringify({ version: 2, college: "churchill", date: "2026-08-11", day: invalidFetched }));
    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();

    const invalidModified = { ...cachedDay(), sourceModifiedAt: "not-a-date" };
    localStorage.setItem(cacheKey, JSON.stringify({ version: 2, college: "churchill", date: "2026-08-11", day: invalidModified }));
    expect(loadCachedDay(localStorage, "churchill", "2026-08-11")).toBeNull();
  });
});
