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
    expect(dialog.textContent).toContain("Lunch · 12:00–14:00");
    expect(dialog.textContent).toContain("Vegetable tart");
    expect(dialog.textContent).toContain("University card required");
    expect(dialog.textContent).toContain("Ask staff about allergens");
    expect(dialog.textContent).toContain("Confirmed without a host");
    expect(dialog.textContent).toContain("Typical self-service dinner: about £7.29");
    expect(dialog.textContent).toContain("Freshness: Live");
    expect(dialog.querySelector('a[href*="google.com/maps/search"]')).not.toBeNull();
    expect(dialog.querySelector("iframe")).toBeNull();
    expect(dialog.querySelector('[data-meal="breakfast"]')).toBeNull();
    expect(dialog.querySelector('[data-meal="brunch"]')).toBeNull();
    const evidence = [...dialog.querySelectorAll("details")].find((details) => details.querySelector("summary")?.textContent === "Evidence, freshness, and source timestamps");
    expect(evidence?.open).toBe(false);
    expect(evidence?.textContent).toContain("Last checked");
    expect(evidence?.textContent).toContain("Source modified");
    expect(evidence?.textContent).toContain("Coverage");
    expect(dialog.querySelector(".detail-overview")?.textContent).not.toContain("Last checked");
    const officialUrl = collegeById("churchill").sources[0]!.url;
    expect([...dialog.querySelectorAll<HTMLAnchorElement>(".evidence-link")].filter(({ href }) => href === officialUrl)).toHaveLength(1);
    expect(dialog.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it("shows both breakfast and brunch only when both are genuinely available", () => {
    const ready = state();
    if (ready.status !== "ready") throw new Error("expected ready state");
    for (const type of ["breakfast", "brunch"] as const) {
      ready.day.meals[type] = { ...ready.day.meals[type], availability: "available", time: type === "breakfast" ? "08:00–09:00" : "10:30–12:00" };
    }
    const dialog = appendDetailDialog(document.createElement("div"), ready, "2026-08-12", vi.fn());
    expect(dialog.querySelector('[data-meal="breakfast"]')?.textContent).toContain("Breakfast · 08:00–09:00");
    expect(dialog.querySelector('[data-meal="brunch"]')?.textContent).toContain("Brunch · 10:30–12:00");
  });

  it("limits visible menu items and combines meal notes with restrictions", () => {
    const ready = state();
    if (ready.status !== "ready") throw new Error("expected ready state");
    ready.day.meals.lunch.menu = [{ kind: "items", items: ["One", "Two", "Three", "Four", "Five", "Six"] }];
    const dialog = appendDetailDialog(document.createElement("div"), ready, "2026-08-12", vi.fn());
    const lunch = dialog.querySelector<HTMLElement>('[data-meal="lunch"]')!;
    expect(lunch.querySelectorAll(":scope > .detail-menu > ul > li")).toHaveLength(4);
    expect(lunch.querySelector("details summary")?.textContent).toBe("Show 2 more items");
    const notes = lunch.querySelector(".meal-notes-restrictions")?.textContent;
    expect(notes).toContain("University card required");
    expect(notes).toContain("Ask staff about allergens");
    expect(lunch.textContent).not.toContain("Meal sources");
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

  it("upgrades a connected fallback dialog to a native modal when supported", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
        this.dataset.nativeModal = "true";
      }
    });
    const root = document.createElement("div");
    document.body.append(root);
    try {
      const dialog = appendDetailDialog(root, state(), "2026-08-12", vi.fn());
      await Promise.resolve();
      expect(dialog.dataset.nativeModal).toBe("true");
      expect(dialog.open).toBe(true);
    } finally {
      root.remove();
      if (descriptor === undefined) delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
      else Object.defineProperty(HTMLDialogElement.prototype, "showModal", descriptor);
    }
  });
});
