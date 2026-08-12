import { describe, expect, it } from "vitest";
import { COLLEGES, collegeById } from "../../src/domain/catalog";
import { COLLEGE_IDS } from "../../src/domain/types";

describe("college catalog", () => {
  it("contains 31 unique colleges in alphabetical display order", () => {
    expect(COLLEGES).toHaveLength(31);
    expect(new Set(COLLEGE_IDS).size).toBe(31);
    expect(new Set(COLLEGES.map(({ id }) => id))).toEqual(new Set(COLLEGE_IDS));
    expect(COLLEGES.map(({ name }) => name)).toEqual(
      [...COLLEGES].map(({ name }) => name).sort((left, right) => left.localeCompare(right, "en-GB"))
    );
  });

  it("exposes the canonical display name and safe source evidence", () => {
    const caius = collegeById("gonville-caius");
    expect(caius.name).toBe("Gonville & Caius");
    expect(caius.sources.length).toBeGreaterThan(0);
    expect(caius.sources.every(({ url }) => url.startsWith("https://"))).toBe(true);
  });

  it("limits direct retrieval to the four structured browser sources", () => {
    expect(COLLEGES.filter(({ retrieval }) => retrieval === "direct").map(({ id }) => id)).toEqual([
      "churchill",
      "darwin",
      "downing",
      "st-edmunds"
    ]);
  });
});
