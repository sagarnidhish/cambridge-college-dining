import { describe, expect, it } from "vitest";
import { eatabilityResults } from "../../src/domain/eatability";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { AccessClass, CollegeId, CollegeViewState, DashboardState, DiningDay, IsoDate, MealType, ServiceWindow, SourceLink } from "../../src/domain/types";

const date: IsoDate = "2026-08-12";
const source: SourceLink = {
  label: "Published dining rules",
  url: "https://example.edu/dining",
  evidence: "official-college",
  asOf: "2026-08-12"
};

function ready(
  id: CollegeId,
  access: AccessClass,
  meal: MealType = "lunch",
  time = "12:30–13:30",
  serviceWindow: ServiceWindow = { kind: "year-round", source }
): CollegeViewState {
  const profile = collegeById(id);
  const day = unknownDiningDay(profile, date, "2026-08-12T08:00:00.000Z", "scheduled");
  day.access = {
    classification: access,
    summary: `${access} access rule`,
    guestRules: "Check the published rule",
    payment: "Card",
    sourceLinks: [source]
  };
  day.meals[meal] = {
    ...day.meals[meal],
    availability: "available",
    time,
    menu: [{ kind: "items", items: [`${profile.name} meal`] }],
    sourceLinks: [source],
    serviceWindow
  };
  day.prices = [{
    label: "Main course",
    amount: "£4.50",
    precision: "exact",
    audience: "Cambridge students",
    asOf: "2026-08-12",
    source
  }];
  return { status: "ready", day };
}

function dashboard(states: Partial<Record<CollegeId, CollegeViewState>>, selectedDate: IsoDate = date): DashboardState {
  return { selectedDate, colleges: states as DashboardState["colleges"] };
}

describe("eatabilityResults", () => {
  it("classifies only sourced unhosted and host-required access", () => {
    const results = eatabilityResults(dashboard({
      downing: ready("downing", "unhosted-cambridge"),
      churchill: ready("churchill", "guest-required")
    }));

    expect(results).toHaveLength(2);
    expect(results.find(({ college }) => college === "downing")).toMatchObject({ tier: "confirmed" });
    expect(results.find(({ college }) => college === "churchill")).toMatchObject({ tier: "host-required" });
  });

  it("excludes unknown, members-only, and unsourced access", () => {
    const unsourced = ready("downing", "unhosted-cambridge");
    if (unsourced.status === "ready" && unsourced.day.access !== undefined) unsourced.day.access.sourceLinks = [];
    const results = eatabilityResults(dashboard({
      downing: unsourced,
      jesus: ready("jesus", "unknown"),
      trinity: ready("trinity", "members-only")
    }));
    expect(results).toEqual([]);
  });

  it("excludes closed, unknown, loading, and error college states", () => {
    const closed = ready("downing", "unhosted-cambridge");
    if (closed.status === "ready") closed.day.meals.lunch.availability = "closed";
    expect(eatabilityResults(dashboard({
      downing: closed,
      churchill: { status: "loading", college: "churchill", collegeName: "Churchill College" },
      clare: { status: "error", college: "clare", collegeName: "Clare College", message: "Unavailable", sourceLinks: [source] }
    }))).toEqual([]);
  });

  it("requires a date-applicable service window", () => {
    const outside = ready("downing", "unhosted-cambridge", "lunch", "12:30–13:30", { kind: "full-term-only", source });
    const unsupportedDay = ready("churchill", "guest-required", "lunch", "12:00–13:00", { kind: "full-term-only", source });
    if (unsupportedDay.status === "ready") unsupportedDay.day.date = "2030-10-08";
    const unknownWindow = ready("darwin", "guest-required", "dinner", "18:00–20:30", { kind: "unknown", source });
    expect(eatabilityResults(dashboard({ downing: outside, darwin: unknownWindow }))).toEqual([]);
    expect(eatabilityResults(dashboard({ churchill: unsupportedDay }, "2030-10-08"))).toEqual([]);
  });

  it("returns deterministic display data and earliest time", () => {
    const downing = ready("downing", "unhosted-cambridge", "dinner", "18:30–19:30");
    if (downing.status === "ready") {
      downing.day.meals.lunch = {
        ...downing.day.meals.lunch,
        availability: "available",
        time: "12:15–13:15",
        menu: [{ kind: "message", message: "Lunch" }],
        serviceWindow: { kind: "year-round", source }
      };
    }
    const results = eatabilityResults(dashboard({ downing, churchill: ready("churchill", "guest-required", "dinner", "Time published on site") }));

    expect(results.map(({ collegeName }) => collegeName)).toEqual(["Churchill College", "Downing College"]);
    expect(results[1]).toMatchObject({
      college: "downing",
      diningArea: "Servery and Hall",
      nextTime: "12:15–13:15",
      accessSummary: "unhosted-cambridge access rule",
      price: { amount: "£4.50" },
      meals: [{ type: "lunch", time: "12:15–13:15" }, { type: "dinner", time: "18:30–19:30" }]
    });
  });

  it("rejects blank map queries", () => {
    const state = ready("downing", "unhosted-cambridge");
    if (state.status === "ready" && state.day.location !== undefined) state.day.location.mapQuery = "   ";
    expect(eatabilityResults(dashboard({ downing: state }))).toEqual([]);
  });
});
