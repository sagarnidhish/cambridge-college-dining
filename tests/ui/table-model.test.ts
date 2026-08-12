import { describe, expect, it } from "vitest";
import { COLLEGES, collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { CollegeId, CollegeViewState, DashboardState, DiningDay, MenuContent } from "../../src/domain/types";
import { DEFAULT_TABLE_OPTIONS, nextMeal, servicesToday, tableRows } from "../../src/ui/table-model";

const date = "2026-08-12" as const;

function availableDay(id: CollegeId, meal: "breakfast" | "brunch" | "lunch" | "dinner", time: string): DiningDay<MenuContent[]> {
  const profile = collegeById(id);
  const day = unknownDiningDay(profile, date, "2026-08-12T08:00:00.000Z", profile.retrieval === "direct" ? "live" : "scheduled");
  day.meals[meal] = {
    ...day.meals[meal],
    availability: "available",
    time,
    menu: [{ kind: "items", items: [`${profile.name} ${meal}`] }]
  };
  return day;
}

function dashboard(): DashboardState {
  const colleges = Object.fromEntries(COLLEGES.map((profile) => [profile.id, {
    status: "ready",
    day: unknownDiningDay(profile, date, "2026-08-12T08:00:00.000Z", profile.retrieval === "direct" ? "live" : "scheduled")
  } satisfies CollegeViewState])) as DashboardState["colleges"];
  colleges.churchill = { status: "ready", day: availableDay("churchill", "lunch", "12:00–14:00") };
  const downing = availableDay("downing", "lunch", "12:30–13:30");
  downing.access = collegeById("downing").access;
  downing.prices = [{
    label: "Meal deal",
    amount: "£4.90",
    precision: "exact",
    audience: "Students",
    asOf: "2026-08-12",
    source: collegeById("downing").sources[0]!
  }];
  colleges.downing = { status: "ready", day: downing };
  colleges.wolfson = { status: "ready", day: availableDay("wolfson", "dinner", "18:00–19:30") };
  colleges.fitzwilliam = { status: "error", college: "fitzwilliam", collegeName: "Fitzwilliam College", message: "Source unavailable", sourceLinks: collegeById("fitzwilliam").sources };
  return { selectedDate: date, colleges };
}

describe("table row derivation", () => {
  it("starts with 31 alphabetical rows and keeps unknown and error colleges visible", () => {
    const rows = tableRows(dashboard(), DEFAULT_TABLE_OPTIONS);
    expect(rows).toHaveLength(31);
    expect(rows.map(({ name }) => name)).toEqual([...rows.map(({ name }) => name)].sort((a, b) => a.localeCompare(b, "en-GB")));
    expect(rows.find(({ id }) => id === "fitzwilliam")).toMatchObject({ status: "error", services: "Unavailable" });
    expect(rows.find(({ id }) => id === "jesus")).toMatchObject({ services: "Not confirmed", access: "Access unknown" });
    expect(rows.find(({ id }) => id === "churchill")?.mapQuery).toBe("Churchill College Dining Hall, Cambridge, UK");
  });

  it("summarizes only affirmatively available services and parses their first time", () => {
    const day = availableDay("churchill", "lunch", "12:00–14:00");
    day.meals.dinner = { ...day.meals.dinner, availability: "available", time: "17:45–19:10" };
    expect(servicesToday(day)).toBe("Lunch, dinner");
    expect(nextMeal(day, 12 * 60 + 30)).toEqual({ label: "Dinner", time: "17:45–19:10", sortMinutes: 17 * 60 + 45 });
  });

  it("requires affirmative evidence for serving, menu, and unhosted filters", () => {
    const rows = tableRows(dashboard(), { ...DEFAULT_TABLE_OPTIONS, serving: true, menuPublished: true, unhosted: true });
    expect(rows.map(({ id }) => id)).toEqual(["churchill"]);
    expect(rows[0]).toMatchObject({ isServing: true, hasPublishedMenu: true, accessClass: "unhosted-cambridge" });
  });

  it("combines normalized search and access-unknown filtering", () => {
    const rows = tableRows(dashboard(), { ...DEFAULT_TABLE_OPTIONS, query: "cafeteria", accessUnknown: true });
    expect(rows.map(({ id }) => id)).toEqual(expect.arrayContaining(["jesus", "wolfson"]));
    expect(rows.every(({ accessClass }) => accessClass === "unknown")).toBe(true);
  });

  it("sorts deterministically and keeps college name as the tie breaker", () => {
    const rows = tableRows(dashboard(), { ...DEFAULT_TABLE_OPTIONS, sort: "services", direction: "desc" });
    expect(rows.slice(0, 3).map(({ id }) => id)).toEqual(["churchill", "downing", "wolfson"]);
    expect(rows.at(-1)?.id).toBe("fitzwilliam");
  });
});
