import { describe, expect, it } from "vitest";
import { parseChurchillDay } from "../../src/sources/churchill";
import { CHURCHILL_PAGE_FIXTURE } from "../fixtures/churchill";

describe("parseChurchillDay", () => {
  it("parses a dated day, times, menus, and official link", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-11", "2026-08-11T21:35:14.000Z");

    expect(day.weekday).toBe("Tuesday");
    expect(day.meals.breakfast).toMatchObject({ availability: "available", time: "07:30–09:30" });
    expect(day.meals.lunch.menu).toMatchObject({ kind: "items" });
    expect(day.meals.lunch.menu.kind === "items" && day.meals.lunch.menu.items).toContain(
      "Today's Special: Churchill Trattoria"
    );
    expect(day.meals.dinner.time).toBe("17:45–19:10");
    expect(day.sourceLinks[0]?.url).toBe(
      "https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/"
    );
  });

  it("keeps scheduled meals available when the menu cell is empty", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-12", "2026-08-11T21:35:14.000Z");

    expect(day.meals.lunch.availability).toBe("available");
    expect(day.meals.lunch.menu).toEqual({ kind: "message", message: "Menu not published" });
  });

  it("distinguishes Saturday brunch from lunch", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-15", "2026-08-11T21:35:14.000Z");

    expect(day.meals.brunch).toMatchObject({ availability: "available", time: "11:30–14:00" });
    expect(day.meals.lunch.availability).toBe("closed");
  });

  it("returns unknown fields outside the published week", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-18", "2026-08-11T21:35:14.000Z");

    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.notices).toContain("No Churchill schedule is published for this date.");
  });
});
