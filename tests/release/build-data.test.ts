import { describe, expect, it } from "vitest";
import { validateBuiltData } from "../../scripts/validate-built-data.mjs";

describe("built scheduled data", () => {
  it("ships one schema-valid scheduled record for each of the 27 colleges", async () => {
    const snapshot = await validateBuiltData("public");
    expect(Object.keys(snapshot.colleges)).toHaveLength(27);
  });

  it("fails closed when the built data file is absent", async () => {
    await expect(validateBuiltData("/tmp/not-a-college-dining-build")).rejects.toThrow();
  });
});
