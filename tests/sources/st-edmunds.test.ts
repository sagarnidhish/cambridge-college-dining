import { describe, expect, it } from "vitest";
import { parseStEdmundsDay } from "../../src/sources/st-edmunds";
import { ST_EDMUNDS_CATERING_FIXTURE, ST_EDMUNDS_POST_FIXTURES } from "../fixtures/st-edmunds";

describe("parseStEdmundsDay", () => {
  it("combines recurring service with the applicable weekly PDFs", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-11",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.breakfast.availability).toBe("closed");
    expect(day.meals.lunch.time).toBe("12:30–13:30");
    expect(day.meals.lunch.menu).toMatchObject({ kind: "pdf", label: "Open official lunch menu PDF" });
    expect(day.meals.dinner.menu).toMatchObject({ kind: "pdf", label: "Open official dinner menu PDF" });
  });

  it("applies a dated timing exception and keeps its note visible", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-13",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.dinner.time).toBe("18:00–18:45");
    expect(day.meals.dinner.notes.join(" ")).toContain("13/08 Dinner Service");
  });

  it("renders Saturday brunch and explicit regular closures", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-15",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.brunch).toMatchObject({ availability: "available", time: "11:00–12:30" });
    expect(day.meals.lunch.availability).toBe("closed");
    expect(day.meals.dinner.availability).toBe("closed");
  });

  it("does not attach an unmatched weekly menu to another date", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-09-01",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.meals.lunch.time).toBe("Normally 12:30–13:30");
    expect(day.meals.lunch.menu).toEqual({ kind: "message", message: "Menu not published for this date" });
    expect(day.notices).toContain("Recurring timetable only; no matching weekly menu is published for this date.");
  });
});
