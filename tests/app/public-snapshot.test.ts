import { describe, expect, it } from "vitest";
import snapshotJson from "../../public/data/college-dining.json";
import { COLLEGES } from "../../src/domain/catalog";
import { eatabilityResults } from "../../src/domain/eatability";
import type { DashboardState, IsoDate } from "../../src/domain/types";
import { scheduledDayFor } from "../../src/snapshots/normalize";
import { parseScheduledSnapshot } from "../../src/snapshots/schema";

function scheduledDashboard(date: IsoDate): DashboardState {
  const snapshot = parseScheduledSnapshot(snapshotJson);
  const colleges = Object.fromEntries(COLLEGES.filter(({ retrieval }) => retrieval === "scheduled").map((profile) => [
    profile.id,
    { status: "ready", day: scheduledDayFor(snapshot, profile, date) }
  ])) as DashboardState["colleges"];
  return { selectedDate: date, colleges };
}

describe("checked-in public scheduled snapshot", () => {
  it("feeds only parsed and access-supported Full Term services into recommendations", () => {
    const results = eatabilityResults(scheduledDashboard("2026-10-07"));
    expect(results.map(({ college, tier }) => ({ college, tier }))).toEqual([
      { college: "corpus-christi", tier: "host-required" },
      { college: "robinson", tier: "host-required" }
    ]);
  });

  it("does not recommend Clare Hall's unparsed event-sensitive normal hours", () => {
    expect(eatabilityResults(scheduledDashboard("2026-08-12")).map(({ college }) => college)).not.toContain("clare-hall");
  });
});
