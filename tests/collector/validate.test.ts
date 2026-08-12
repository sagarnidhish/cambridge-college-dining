import { describe, expect, it } from "vitest";
import { validateCollegeAttempt, validateSnapshot } from "../../scripts/collector/validate.mjs";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";
import { SCHEDULED_SOURCES } from "../../scripts/collector/catalog.mjs";
import { COLLEGES } from "../../src/domain/catalog";

describe("collector validation", () => {
  it("keeps collector primaries aligned with the public catalog", () => {
    const scheduled = new Map(COLLEGES.filter(({ retrieval }) => retrieval === "scheduled").map(({ id, sources }) => [id, sources]));
    expect(SCHEDULED_SOURCES).toHaveLength(scheduled.size);
    for (const { id, url } of SCHEDULED_SOURCES) {
      expect(scheduled.get(id as (typeof COLLEGES)[number]["id"])?.some((source) => source.url === url), `${id}: ${url}`).toBe(true);
    }
  });

  it("accepts the complete 27-college schema", () => {
    expect(validateSnapshot(scheduledSnapshotFixture()).schemaVersion).toBe(2);
  });

  it("rejects an empty successful parse so it cannot replace good menu data", () => {
    expect(() => validateCollegeAttempt({
      college: "wolfson",
      coverage: "menu",
      collectedAt: "2026-08-12T09:00:00.000Z",
      sourceModifiedAt: null,
      validFrom: null,
      validThrough: null,
      mealsByDate: {},
      recurringMeals: {},
      notices: []
    })).toThrow(/menu coverage/i);
  });

  it("rejects non-HTTPS menu evidence", () => {
    const attempt = scheduledSnapshotFixture().colleges.wolfson;
    expect(() => validateCollegeAttempt({
      ...attempt,
      coverage: "menu",
      recurringMeals: {
        lunch: {
          availability: "available",
          time: "12:00–13:00",
          menu: { kind: "link", label: "Menu", url: "http://example.test/menu" },
          notes: [],
          sourceLinks: []
        }
      }
    })).toThrow(/HTTPS/i);
  });

  it("rejects invalid service windows before collection output is published", () => {
    const attempt = scheduledSnapshotFixture().colleges.robinson!;
    expect(() => validateCollegeAttempt({
      ...attempt,
      recurringMeals: {
        lunch: {
          availability: "available",
          time: "12:20–13:40",
          menu: { kind: "message", message: "Published schedule" },
          notes: [],
          sourceLinks: [],
          serviceWindow: { kind: "date-specific", date: "not-a-date", source: { label: "Hours", url: "https://example.test/hours" } }
        }
      }
    })).toThrow(/service window/i);
  });
});
