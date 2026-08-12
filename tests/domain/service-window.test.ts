import { describe, expect, it } from "vitest";
import { effectiveMealForDate, serviceWindowApplicability } from "../../src/domain/service-window";
import type { MealRecord, ServiceWindow, SourceLink } from "../../src/domain/types";

const termSource: SourceLink = {
  label: "University Full Term dates",
  url: "https://www.cam.ac.uk/about-the-university/term-dates-and-calendars",
  evidence: "official-university",
  asOf: "2026-08-12"
};

const meal = (serviceWindow: ServiceWindow): MealRecord => ({
  type: "lunch",
  availability: "available",
  time: "12:00–13:00",
  menu: { kind: "message", message: "Published lunch" },
  notes: [],
  sourceLinks: [{ label: "Lunch timetable", url: "https://example.edu/lunch" }],
  serviceWindow
});

describe("service-window applicability", () => {
  it("treats official Full Term boundaries as inclusive", () => {
    const window: ServiceWindow = { kind: "full-term-only", source: termSource };
    expect(serviceWindowApplicability(window, "2026-10-06")).toBe("applicable");
    expect(serviceWindowApplicability(window, "2026-12-04")).toBe("applicable");
    expect(serviceWindowApplicability(window, "2026-10-05")).toBe("outside");
    expect(serviceWindowApplicability(window, "2026-12-05")).toBe("outside");
    expect(serviceWindowApplicability(window, "2030-10-08")).toBe("unknown");
  });

  it("supports inclusive date ranges and exact dates", () => {
    const range: ServiceWindow = {
      kind: "date-range",
      validFrom: "2026-08-10",
      validThrough: "2026-08-16",
      source: termSource
    };
    expect(serviceWindowApplicability(range, "2026-08-10")).toBe("applicable");
    expect(serviceWindowApplicability(range, "2026-08-16")).toBe("applicable");
    expect(serviceWindowApplicability(range, "2026-08-17")).toBe("outside");

    const exact: ServiceWindow = { kind: "date-specific", date: "2026-08-12", source: termSource };
    expect(serviceWindowApplicability(exact, "2026-08-12")).toBe("applicable");
    expect(serviceWindowApplicability(exact, "2026-08-13")).toBe("outside");
  });

  it("keeps year-round and unknown windows conservative", () => {
    expect(serviceWindowApplicability({ kind: "year-round", source: termSource }, "2035-01-01")).toBe("applicable");
    expect(serviceWindowApplicability({ kind: "unknown" }, "2026-08-12")).toBe("unknown");
    expect(serviceWindowApplicability(undefined, "2026-08-12")).toBe("unknown");
  });
});

describe("effectiveMealForDate", () => {
  it("closes an explicitly Full Term meal outside supported Full Term", () => {
    const original = meal({ kind: "full-term-only", source: termSource });
    const effective = effectiveMealForDate(original, "2026-08-12");
    expect(effective.availability).toBe("closed");
    expect(effective.notes).toContain("Published for Full Term only");
    expect(effective.sourceLinks.filter(({ url }) => url === termSource.url)).toHaveLength(1);
    expect(original.availability).toBe("available");
    expect(original.notes).toEqual([]);
  });

  it("does not claim closure when the official calendar is unsupported", () => {
    const effective = effectiveMealForDate(meal({ kind: "full-term-only", source: termSource }), "2030-10-08");
    expect(effective.availability).toBe("unknown");
    expect(effective.notes).toContain("Term applicability not confirmed");
  });

  it("does not upgrade an unknown meal inside its service window", () => {
    const original = meal({ kind: "year-round", source: termSource });
    original.availability = "unknown";
    expect(effectiveMealForDate(original, "2026-08-12").availability).toBe("unknown");
  });

  it("renders a published term-only service closed outside Full Term even when its menu is unknown", () => {
    const original = meal({ kind: "full-term-only", source: termSource });
    original.availability = "unknown";
    const effective = effectiveMealForDate(original, "2026-08-12");
    expect(effective.availability).toBe("closed");
    expect(effective.notes).toContain("Published for Full Term only");
  });
});
