import { describe, expect, it } from "vitest";
import { mergeCollection } from "../../scripts/collector/merge.mjs";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";

describe("last-good collection merge", () => {
  it("carries a failed college forward without changing its timestamp", () => {
    const previous = scheduledSnapshotFixture();
    const before = previous.colleges.newnham!.collectedAt;
    const merged = mergeCollection(previous, new Map([
      ["newnham", { ok: false, warning: "HTTP 503" }]
    ]), "2026-08-12T10:00:00.000Z");

    expect(merged.colleges.newnham.collectedAt).toBe(before);
    expect(merged.colleges.newnham.warning).toContain("HTTP 503");
  });

  it("updates a validated record but leaves unattempted records unchanged", () => {
    const previous = scheduledSnapshotFixture();
    const updated = { ...previous.colleges.wolfson, collectedAt: "2026-08-12T10:00:00.000Z" };
    const merged = mergeCollection(previous, new Map([
      ["wolfson", { ok: true, record: updated }]
    ]), "2026-08-12T10:00:00.000Z");

    expect(merged.colleges.wolfson.collectedAt).toBe("2026-08-12T10:00:00.000Z");
    expect(merged.colleges.newnham).toEqual(previous.colleges.newnham);
  });
});
