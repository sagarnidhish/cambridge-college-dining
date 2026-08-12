import { describe, expect, it } from "vitest";
import { collegeById } from "../../src/domain/catalog";
import { scheduledDayFor } from "../../src/snapshots/normalize";
import { parseScheduledSnapshot } from "../../src/snapshots/schema";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";

describe("scheduled snapshot normalization", () => {
  it("keeps a link-only record unknown rather than closed", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const day = scheduledDayFor(snapshot, collegeById("jesus"), "2026-08-12");
    expect(day.coverage).toBe("link-only");
    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.freshness).toBe("scheduled");
  });

  it("prefers a matching dated meal and preserves all other unknown meals", () => {
    const input = scheduledSnapshotFixture();
    input.colleges.newnham!.coverage = "menu";
    input.colleges.newnham!.validFrom = "2026-08-11";
    input.colleges.newnham!.validThrough = "2026-08-17";
    input.colleges.newnham!.mealsByDate = {
      "2026-08-12": {
        lunch: {
          availability: "available",
          time: "12:30–13:30",
          menu: { kind: "pdf", label: "Buttery menu", url: "https://newn.cam.ac.uk/menu.pdf" },
          notes: ["Published weekly menu"],
          restrictions: ["Check allergens with staff"],
          sourceLinks: []
        }
      }
    };
    const day = scheduledDayFor(parseScheduledSnapshot(input), collegeById("newnham"), "2026-08-12");
    expect(day.meals.lunch).toMatchObject({ availability: "available", time: "12:30–13:30" });
    expect(day.meals.dinner.availability).toBe("unknown");
  });

  it("does not apply recurring data outside a stated validity window", () => {
    const input = scheduledSnapshotFixture();
    input.colleges.girton!.coverage = "schedule";
    input.colleges.girton!.validFrom = "2026-10-01";
    input.colleges.girton!.validThrough = "2026-12-04";
    input.colleges.girton!.recurringMeals = {
      lunch: {
        availability: "available",
        time: "12:00–13:30",
        menu: { kind: "message", message: "Menu not publicly confirmed" },
        notes: [],
        restrictions: [],
        sourceLinks: []
      }
    };
    const day = scheduledDayFor(parseScheduledSnapshot(input), collegeById("girton"), "2026-08-12");
    expect(day.meals.lunch.availability).toBe("unknown");
  });
});
