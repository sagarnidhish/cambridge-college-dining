import { describe, expect, it } from "vitest";
import { parseScheduledSnapshot } from "../../src/snapshots/schema";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";
import bootstrap from "../../public/data/college-dining.json";

describe("scheduled snapshot schema", () => {
  it("accepts exactly the 27 scheduled college records", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    expect(Object.keys(snapshot.colleges)).toHaveLength(27);
  });

  it("ships a schema-valid checked-in bootstrap", () => {
    expect(Object.keys(parseScheduledSnapshot(bootstrap).colleges)).toHaveLength(27);
  });

  it("rejects a snapshot missing one scheduled college", () => {
    const invalid = scheduledSnapshotFixture();
    delete invalid.colleges.newnham;
    expect(() => parseScheduledSnapshot(invalid)).toThrow(/27 scheduled colleges/);
  });

  it("rejects invalid timestamps and unsafe menu links", () => {
    const invalidTime = scheduledSnapshotFixture();
    invalidTime.collectedAt = "not-a-date";
    expect(() => parseScheduledSnapshot(invalidTime)).toThrow(/timestamp/);

    const invalidLink = scheduledSnapshotFixture();
    invalidLink.colleges.newnham!.coverage = "menu";
    invalidLink.colleges.newnham!.mealsByDate = {
      "2026-08-12": {
        lunch: {
          availability: "available",
          time: "12:30–13:30",
          menu: { kind: "link", label: "Menu", url: "javascript:alert(1)" },
          notes: [],
          restrictions: [],
          sourceLinks: []
        }
      }
    };
    expect(() => parseScheduledSnapshot(invalidLink)).toThrow(/HTTPS/);
  });

  it("rejects menu coverage with no published menu content", () => {
    const invalid = scheduledSnapshotFixture();
    invalid.colleges.wolfson!.coverage = "menu";
    expect(() => parseScheduledSnapshot(invalid)).toThrow(/menu coverage/);
  });
});
