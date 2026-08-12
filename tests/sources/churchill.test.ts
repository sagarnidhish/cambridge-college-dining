import { describe, expect, it } from "vitest";
import { parseChurchillDay } from "../../src/sources/churchill";
import { CHURCHILL_PAGE_FIXTURE } from "../fixtures/churchill";

describe("parseChurchillDay", () => {
  it("parses a dated day, times, menus, and official link", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-11", "2026-08-11T21:35:14.000Z");

    expect(day.weekday).toBe("Tuesday");
    expect(day).toMatchObject({
      college: "churchill",
      freshness: "live",
      coverage: "menu",
      access: { classification: "guest-required" },
      location: { diningArea: "Dining Hall" }
    });
    expect(day.meals.breakfast).toMatchObject({ availability: "available", time: "07:30–09:30" });
    expect(day.meals.lunch.menu[0]).toMatchObject({ kind: "items" });
    expect(day.meals.lunch.menu[0]?.kind === "items" && day.meals.lunch.menu[0].items).toContain(
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
    expect(day.meals.lunch.menu).toEqual([{ kind: "message", message: "Menu not published" }]);
  });

  it("distinguishes Saturday brunch from lunch", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-15", "2026-08-11T21:35:14.000Z");

    expect(day.meals.brunch).toMatchObject({ availability: "available", time: "11:30–14:00" });
    expect(day.meals.lunch.availability).toBe("closed");
  });

  it("returns unknown fields outside the published week", () => {
    const day = parseChurchillDay(CHURCHILL_PAGE_FIXTURE, "2026-08-18", "2026-08-11T21:35:14.000Z");

    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.coverage).toBe("link-only");
    expect(day.notices).toContain("No Churchill schedule is published for this date.");
    expect(day.sourceModifiedAt).toBe("2026-08-11T15:52:23");
  });

  it("keeps matched-day Please note notices visible", () => {
    const page = {
      ...CHURCHILL_PAGE_FIXTURE,
      content: {
        ...CHURCHILL_PAGE_FIXTURE.content,
        rendered: `${CHURCHILL_PAGE_FIXTURE.content.rendered}<p>Please note: The dining hall closes promptly.</p>`
      }
    };

    expect(parseChurchillDay(page, "2026-08-11", "2026-08-11T21:35:14.000Z").notices)
      .toContain("Please note: The dining hall closes promptly.");
  });

  it("rejects a matched day whose timetable row is malformed", () => {
    const page = {
      ...CHURCHILL_PAGE_FIXTURE,
      content: {
        ...CHURCHILL_PAGE_FIXTURE.content,
        rendered: CHURCHILL_PAGE_FIXTURE.content.rendered.replace("Breakfast &#8211; 07:30-09:30", "Breakfast - morning")
      }
    };

    expect(() => parseChurchillDay(page, "2026-08-11", "2026-08-11T21:35:14.000Z"))
      .toThrow("Churchill timetable is incomplete");
  });
});
