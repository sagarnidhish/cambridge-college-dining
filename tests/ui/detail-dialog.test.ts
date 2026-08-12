import { describe, expect, it, vi } from "vitest";
import { collegeById } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { CollegeViewState } from "../../src/domain/types";
import { appendDetailDialog } from "../../src/ui/detail-dialog";

function state(): CollegeViewState {
  const day = unknownDiningDay(collegeById("churchill"), "2026-08-12", "2026-08-12T08:00:00.000Z", "live");
  day.meals.breakfast = { ...day.meals.breakfast, availability: "closed", time: "Closed", menu: [{ kind: "message", message: "Service closed" }] };
  day.meals.brunch = { ...day.meals.brunch, availability: "closed", time: "Closed", menu: [{ kind: "message", message: "Service closed" }] };
  day.meals.lunch = {
    ...day.meals.lunch,
    availability: "available",
    time: "12:00–14:00",
    menu: [{ kind: "items", items: ["Vegetable tart", "Chicken pie"] }],
    notes: ["University card required"],
    restrictions: ["Ask staff about allergens"]
  };
  day.sourceLinks = [
    ...day.sourceLinks,
    { label: "Unsafe", url: "javascript:alert(1)", evidence: "official-college" }
  ];
  return { status: "ready", day };
}

describe("college detail dialog", () => {
  it("renders every mandatory field and groups closed separately from unknown meals", () => {
    const root = document.createElement("div");
    const dialog = appendDetailDialog(root, state(), "2026-08-12", vi.fn());

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Wednesday, 12 August 2026");
    expect(dialog.textContent).toContain("Closed today: Breakfast, brunch");
    expect(dialog.textContent).toContain("Not confirmed: Dinner");
    expect(dialog.textContent).toContain("Lunch");
    expect(dialog.textContent).toContain("12:00–14:00");
    expect(dialog.textContent).toContain("Vegetable tart");
    expect(dialog.textContent).toContain("University card required");
    expect(dialog.textContent).toContain("Ask staff about allergens");
    expect(dialog.textContent).toContain("Host or guest arrangement");
    expect(dialog.textContent).toContain("Price not publicly confirmed");
    expect(dialog.textContent).toContain("Freshness: Live");
    expect(dialog.querySelector('a[href*="google.com/maps/search"]')).not.toBeNull();
    expect(dialog.querySelector('iframe[src*="google.com/maps"]')?.getAttribute("title")).toContain("Churchill College dining location map");
    expect(dialog.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it("renders a source-error detail without manufacturing meal facts", () => {
    const root = document.createElement("div");
    const dialog = appendDetailDialog(root, {
      status: "error",
      college: "newnham",
      collegeName: "Newnham College",
      message: "Current data unavailable",
      sourceLinks: collegeById("newnham").sources
    }, "2026-08-12", vi.fn());
    expect(dialog.textContent).toContain("Current data unavailable");
    expect(dialog.textContent).toContain("Wednesday, 12 August 2026");
    expect(dialog.textContent).toContain("Open verification source");
    expect(dialog.textContent).not.toContain("Available");
  });

  it("closes on Escape and wraps keyboard focus", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const close = vi.fn();
    const dialog = appendDetailDialog(root, state(), "2026-08-12", close);
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, a[href], iframe')];
    focusable.at(-1)?.focus();
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(focusable[0]);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(close).toHaveBeenCalledOnce();
    root.remove();
  });
});
