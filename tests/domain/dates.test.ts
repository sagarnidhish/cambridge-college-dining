import { describe, expect, it } from "vitest";
import {
  addIsoDays,
  formatCambridgeTimestamp,
  isIsoDate,
  todayInCambridge,
  termStatusFor,
  weekdayForIso
} from "../../src/domain/dates";

describe("Cambridge dates", () => {
  it("uses the Cambridge calendar date around midnight UTC", () => {
    expect(todayInCambridge(new Date("2026-08-11T23:30:00Z"))).toBe("2026-08-12");
  });

  it("adds calendar days across a daylight-saving boundary", () => {
    expect(addIsoDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(weekdayForIso("2026-10-26")).toBe("Monday");
  });

  it("recognizes real ISO calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("18-08-2026")).toBe(false);
  });

  it("formats timestamps in the Cambridge timezone", () => {
    expect(formatCambridgeTimestamp("2026-08-11T23:30:00.000Z")).toBe("12 Aug 2026, 00:30");
  });

  it("uses published Full Term boundaries without extrapolating", () => {
    expect(termStatusFor("2026-10-06")).toBe("Full Term");
    expect(termStatusFor("2026-12-04")).toBe("Full Term");
    expect(termStatusFor("2026-12-05")).toBe("Outside Full Term");
    expect(termStatusFor("2030-10-08")).toBe("Term dates not confirmed");
  });
});
