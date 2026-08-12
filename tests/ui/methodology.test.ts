import { describe, expect, it } from "vitest";
import { appendMethodology } from "../../src/ui/methodology";

describe("Sources and Methodology", () => {
  it("lists all 31 college source groups and all four evidence definitions", () => {
    const root = document.createElement("main");
    appendMethodology(root, { collectedAt: "2026-08-12T09:00:00.000Z" });

    expect(root.querySelectorAll("[data-source-college]")).toHaveLength(31);
    for (const label of ["Official college", "Official University", "Official student body", "Supplementary, not official"]) {
      expect(root.textContent).toContain(label);
    }
    expect(root.textContent).toContain("12 Aug 2026, 10:00");
    expect(root.textContent).toContain("Access and prices can change");
    expect(root.textContent).toContain("Confirmed without a host");
    expect(root.textContent).toContain("Available meal");
    expect(root.textContent).toContain("page-load badge");
  });

  it("renders only safe HTTPS evidence links", () => {
    const root = document.createElement("main");
    appendMethodology(root);
    const links = [...root.querySelectorAll<HTMLAnchorElement>("[data-source-college] a")];
    expect(links.length).toBeGreaterThanOrEqual(31);
    expect(links.every((link) => new URL(link.href).protocol === "https:")).toBe(true);
  });
});
