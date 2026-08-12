import { describe, expect, it } from "vitest";
import { COLLEGES, collegeById } from "../../src/domain/catalog";
import { validateCollegeProfiles } from "../../src/domain/catalog-validation";

describe("catalog evidence validation", () => {
  it("keeps all 31 profiles complete, sourced, and structurally valid", () => {
    expect(validateCollegeProfiles(COLLEGES)).toEqual([]);
  });

  it("records public unhosted access only where the everyday service says so", () => {
    expect(collegeById("churchill").access).toMatchObject({
      classification: "unhosted-cambridge",
      payment: expect.stringContaining("card")
    });
    expect(collegeById("robinson").access).toMatchObject({
      classification: "unhosted-cambridge",
      payment: expect.stringMatching(/credit|University Card/i)
    });
    expect(collegeById("downing").access.classification).toBe("unknown");
    expect(collegeById("christs").access.classification).toBe("unknown");
    expect(collegeById("clare").access.classification).toBe("unknown");
  });

  it("captures priority price, payment, and term evidence without invented estimates", () => {
    expect(collegeById("churchill").prices).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: "about £7.29", precision: "approximate", audience: "Churchill students" })
    ]));
    expect(collegeById("robinson").prices).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: "£4.25–£4.70", precision: "exact", audience: "Non-members" }),
      expect.objectContaining({ amount: "£7.15", precision: "exact", audience: "Non-members" })
    ]));
    expect(collegeById("clare").prices).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: "about £5–£7", precision: "approximate", audience: "Clare members" })
    ]));
    expect(collegeById("darwin").prices).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: "£2.90–£4.75", precision: "exact" })
    ]));
    expect(collegeById("christs").serviceWindows?.lunch?.kind).toBe("full-term-only");
    expect(collegeById("robinson").serviceWindows?.dinner?.kind).toBe("full-term-only");
    expect(collegeById("kings").serviceWindows?.brunch?.kind).toBe("full-term-only");
  });

  it("keeps venue-specific member-host routes distinct from general public access", () => {
    expect(collegeById("clare-hall").access.classification).toBe("guest-required");
    expect(collegeById("corpus-christi").access.classification).toBe("guest-required");
    expect(collegeById("kings").access.classification).toBe("guest-required");
    expect(collegeById("queens").access.classification).toBe("guest-required");
    expect(collegeById("pembroke").access.classification).toBe("guest-required");
    expect(collegeById("st-johns").access.classification).toBe("unknown");
  });
});
