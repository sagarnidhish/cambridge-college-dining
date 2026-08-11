import { describe, expect, it } from "vitest";
import { closedMeal, createUnknownDiningDay, unknownMeal } from "../../src/domain/meals";

describe("unknown daily records", () => {
  it("contains every mandatory meal and explicit missing values", () => {
    const day = createUnknownDiningDay({
      college: "churchill",
      collegeName: "Churchill College",
      date: "2026-08-18",
      sourceLinks: [{ label: "View official source", url: "https://www.chu.cam.ac.uk/" }],
      fetchedAt: "2026-08-11T21:00:00.000Z"
    });

    expect(Object.keys(day.meals)).toEqual(["breakfast", "brunch", "lunch", "dinner"]);
    expect(day.meals.lunch).toMatchObject({
      availability: "unknown",
      time: "Time not published",
      menu: { kind: "message", message: "Menu not published" },
      notes: ["No special notes published"]
    });
  });

  it("creates explicit unknown and closed meal records", () => {
    expect(unknownMeal("breakfast")).toEqual({
      type: "breakfast",
      availability: "unknown",
      time: "Time not published",
      menu: { kind: "message", message: "Menu not published" },
      notes: ["No special notes published"],
      sourceLinks: []
    });
    expect(closedMeal("dinner")).toEqual({
      type: "dinner",
      availability: "closed",
      time: "Closed",
      menu: { kind: "message", message: "Service closed" },
      notes: ["No special notes published"],
      sourceLinks: []
    });
  });
});
