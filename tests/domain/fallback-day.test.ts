import { expect, it } from "vitest";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { CollegeProfile } from "../../src/domain/types";

it("builds a complete explicit unknown day", () => {
  const day = unknownDiningDay(
    collegeById("newnham"),
    "2026-08-12",
    "2026-08-12T08:00:00.000Z",
    "scheduled"
  );

  expect(Object.keys(day.meals)).toEqual(["breakfast", "brunch", "lunch", "dinner"]);
  expect(day.meals.lunch).toMatchObject({
    availability: "unknown",
    time: "Time not published",
    menu: [{ kind: "message", message: "Menu not publicly confirmed" }],
    restrictions: []
  });
  expect(day).toMatchObject({
    college: "newnham",
    weekday: "Wednesday",
    freshness: "scheduled",
    coverage: "link-only",
    location: { diningArea: "Buttery" }
  });
});

it("retains an optional source warning", () => {
  const day = unknownDiningDay(
    collegeById("jesus"),
    "2026-08-12",
    "2026-08-12T08:00:00.000Z",
    "scheduled",
    "Source blocked automated collection"
  );

  expect(day.collectionWarning).toBe("Source blocked automated collection");
});

it("inherits evidence-bearing service windows without asserting availability", () => {
  const base = collegeById("newnham");
  const profile: CollegeProfile = {
    ...base,
    serviceWindows: {
      lunch: { kind: "full-term-only", source: base.sources[0]! }
    }
  };
  const day = unknownDiningDay(profile, "2026-08-12", "2026-08-12T08:00:00.000Z", "scheduled");
  expect(day.meals.lunch.serviceWindow).toEqual(profile.serviceWindows?.lunch);
  expect(day.meals.lunch.availability).toBe("unknown");
  expect(day.meals.breakfast.serviceWindow).toBeUndefined();
});
