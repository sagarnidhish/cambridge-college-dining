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

  it("applies authored Full Term weekday hours to the selected day", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const weekday = scheduledDayFor(snapshot, collegeById("robinson"), "2026-10-07");
    const weekend = scheduledDayFor(snapshot, collegeById("robinson"), "2026-10-10");

    expect(weekday.coverage).toBe("schedule");
    expect(weekday.meals.lunch).toMatchObject({
      availability: "available",
      time: "12:20–13:40",
      serviceWindow: { kind: "full-term-only" }
    });
    expect(weekday.meals.dinner).toMatchObject({ availability: "available", time: "18:00–19:15" });
    expect(weekday.meals.brunch.availability).toBe("unknown");
    expect(weekend.meals.brunch).toMatchObject({ availability: "available", time: "12:00–13:30" });
    expect(weekend.meals.lunch.availability).toBe("unknown");
  });

  it("does not promote authored Full Term hours outside Full Term", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const day = scheduledDayFor(snapshot, collegeById("robinson"), "2026-08-12");

    expect(day.coverage).toBe("link-only");
    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.meals.dinner.availability).toBe("unknown");
  });

  it("uses documented Christ's weekend service patterns without implying access", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const day = scheduledDayFor(snapshot, collegeById("christs"), "2026-10-10");

    expect(day.meals.breakfast.availability).toBe("unknown");
    expect(day.meals.brunch).toMatchObject({ availability: "available", time: "10:30–12:30" });
    expect(day.meals.dinner).toMatchObject({ availability: "available", time: "17:50–19:00" });
    expect(day.access?.classification).toBe("unknown");
  });

  it("shows Clare's sourced weekday Buttery hours only in Full Term", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const day = scheduledDayFor(snapshot, collegeById("clare"), "2026-10-07");

    expect(day.meals.breakfast).toMatchObject({ availability: "available", time: "08:00–09:00" });
    expect(day.meals.lunch).toMatchObject({ availability: "available", time: "12:30–13:30" });
    expect(day.meals.dinner).toMatchObject({ availability: "available", time: "18:15–19:15" });
    expect(day.meals.brunch.availability).toBe("unknown");
    expect(day.access?.classification).toBe("unknown");
  });

  it("shows Corpus's sourced weekend pattern as host-required", () => {
    const snapshot = parseScheduledSnapshot(scheduledSnapshotFixture());
    const saturday = scheduledDayFor(snapshot, collegeById("corpus-christi"), "2026-10-10");
    const sunday = scheduledDayFor(snapshot, collegeById("corpus-christi"), "2026-10-11");

    expect(saturday.meals.brunch).toMatchObject({ availability: "available", time: "11:30–13:00" });
    expect(saturday.meals.dinner.availability).toBe("unknown");
    expect(sunday.meals.brunch).toMatchObject({ availability: "available", time: "11:30–13:00" });
    expect(sunday.meals.dinner).toMatchObject({ availability: "available", time: "17:45–18:45" });
    expect(sunday.access?.classification).toBe("guest-required");
  });
});
