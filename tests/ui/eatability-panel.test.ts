import { describe, expect, it, vi } from "vitest";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { CollegeId, CollegeViewState, DashboardState } from "../../src/domain/types";
import { appendEatabilityPanel } from "../../src/ui/eatability-panel";

const source = { label: "Dining rules", url: "https://example.edu/dining", evidence: "official-college" as const, asOf: "2026-08-12" };

function ready(id: CollegeId, tier: "unhosted-cambridge" | "guest-required", meal: "lunch" | "dinner", time: string): CollegeViewState {
  const profile = collegeById(id);
  const day = unknownDiningDay(profile, "2026-08-12", "2026-08-12T08:00:00.000Z", "scheduled");
  day.access = { classification: tier, summary: tier === "unhosted-cambridge" ? "Cambridge students may enter" : "A member host is required", guestRules: "Verify first", payment: "Card", sourceLinks: [source] };
  day.meals[meal] = { ...day.meals[meal], availability: "available", time, menu: [{ kind: "message", message: "Menu" }], sourceLinks: [source], serviceWindow: { kind: "year-round", source } };
  day.prices = [{ label: "Main", amount: "£4.50", precision: "exact", audience: "Cambridge students", asOf: "2026-08-12", source }];
  return { status: "ready", day };
}

function dashboard(states: Partial<Record<CollegeId, CollegeViewState>>): DashboardState {
  return { selectedDate: "2026-08-12", colleges: states as DashboardState["colleges"] };
}

describe("eatability panel", () => {
  it("renders two evidence tiers and initially focuses the first confirmed option", () => {
    const root = document.createElement("div");
    appendEatabilityPanel(root, dashboard({
      downing: ready("downing", "unhosted-cambridge", "lunch", "12:30–13:30"),
      churchill: ready("churchill", "guest-required", "dinner", "17:45–19:10")
    }), null, { focusCollege: vi.fn(), openCollege: vi.fn() });

    expect(root.textContent).toContain("Confirmed without a host (1)");
    expect(root.textContent).toContain("Host or booking needed (1)");
    expect(root.textContent).toContain("Lunch · 12:30–13:30");
    expect(root.textContent).toContain("£4.50");
    expect(root.querySelector('[data-map-college="downing"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector("iframe")?.getAttribute("title")).toBe("Downing College dining location map");
    expect(root.querySelector("iframe")?.getAttribute("loading")).toBe("lazy");
    expect(root.querySelector("iframe")?.getAttribute("referrerpolicy")).toBe("no-referrer-when-downgrade");
    expect(root.querySelector("iframe")?.getAttribute("src")).toContain("https://www.google.com/maps?q=");
  });

  it("changes map focus without opening details", () => {
    const root = document.createElement("div");
    const focusCollege = vi.fn();
    const openCollege = vi.fn();
    const state = dashboard({
      downing: ready("downing", "unhosted-cambridge", "lunch", "12:30–13:30"),
      churchill: ready("churchill", "guest-required", "dinner", "17:45–19:10")
    });
    appendEatabilityPanel(root, state, "downing", { focusCollege, openCollege });
    root.querySelector<HTMLButtonElement>('[data-map-college="churchill"]')!.click();
    expect(focusCollege).toHaveBeenCalledWith("churchill");
    expect(openCollege).not.toHaveBeenCalled();

    root.replaceChildren();
    appendEatabilityPanel(root, state, "churchill", { focusCollege, openCollege });
    expect(root.querySelector("iframe")?.getAttribute("title")).toBe("Churchill College dining location map");
    expect(root.querySelector('[data-map-college="churchill"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector<HTMLAnchorElement>(".eatability-map-link")?.href).toContain("google.com/maps/search/");
  });

  it("opens details only through the separate action", () => {
    const root = document.createElement("div");
    const openCollege = vi.fn();
    appendEatabilityPanel(root, dashboard({ downing: ready("downing", "unhosted-cambridge", "lunch", "12:30–13:30") }), null, { focusCollege: vi.fn(), openCollege });
    root.querySelector<HTMLButtonElement>('[data-map-details="downing"]')!.click();
    expect(openCollege).toHaveBeenCalledWith("downing");
    expect(root.querySelector<HTMLButtonElement>('[data-map-details="downing"]')?.dataset.focusKey).toBe("map-details-downing");
  });

  it("shows an honest empty state without an arbitrary map", () => {
    const root = document.createElement("div");
    appendEatabilityPanel(root, dashboard({}), null, { focusCollege: vi.fn(), openCollege: vi.fn() });
    expect(root.textContent).toContain("No option confirmed from current public evidence");
    expect(root.querySelector("iframe")).toBeNull();
  });

  it("distinguishes loading from a completed no-evidence result", () => {
    const root = document.createElement("div");
    appendEatabilityPanel(root, dashboard({
      churchill: { status: "loading", college: "churchill", collegeName: "Churchill College" }
    }), null, { focusCollege: vi.fn(), openCollege: vi.fn() });

    expect(root.textContent).toContain("Loading current public dining evidence");
    expect(root.textContent).not.toContain("No option confirmed from current public evidence");
    expect(root.textContent).not.toContain("No source-confirmed options in this tier");
  });
});
