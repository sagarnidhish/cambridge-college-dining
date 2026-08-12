import { describe, expect, it, vi } from "vitest";
import { COLLEGES } from "../../src/domain/catalog";
import { unknownDiningDay } from "../../src/domain/fallback-day";
import type { CollegeViewState, DashboardState } from "../../src/domain/types";
import { DEFAULT_TABLE_OPTIONS } from "../../src/ui/table-model";
import { renderDashboard, type DashboardActions, type DashboardViewState } from "../../src/ui/render";

const selectedDate = "2026-08-12" as const;

function dashboard(): DashboardState {
  return {
    selectedDate,
    colleges: Object.fromEntries(COLLEGES.map((profile) => [profile.id, {
      status: "ready",
      day: unknownDiningDay(profile, selectedDate, "2026-08-12T08:00:00.000Z", profile.retrieval === "direct" ? "live" : "scheduled")
    } satisfies CollegeViewState])) as DashboardState["colleges"]
  };
}

function actions(): DashboardActions {
  return {
    previousDate: vi.fn(),
    nextDate: vi.fn(),
    selectToday: vi.fn(),
    selectDate: vi.fn(),
    refresh: vi.fn(),
    setQuery: vi.fn(),
    setFilter: vi.fn(),
    sortBy: vi.fn(),
    clearFilters: vi.fn(),
    focusEatabilityCollege: vi.fn(),
    openCollege: vi.fn(),
    closeCollege: vi.fn()
  };
}

function view(overrides: Partial<DashboardViewState> = {}): DashboardViewState {
  return { dashboard: dashboard(), options: { ...DEFAULT_TABLE_OPTIONS }, focusedEatabilityCollege: null, selectedCollege: null, view: "directory", ...overrides };
}

describe("directory rendering", () => {
  it("renders the exact desktop columns and all 31 alphabetical college rows", () => {
    const root = document.createElement("main");
    renderDashboard(root, view(), actions());

    expect([...root.querySelectorAll("thead th")].map((cell) => cell.textContent?.trim())).toEqual([
      "College", "Services today", "Next meal/time", "Access", "Indicative price", "Freshness"
    ]);
    expect(root.querySelectorAll("tbody tr")).toHaveLength(31);
    expect([...root.querySelectorAll<HTMLButtonElement>(".college-row-button")].map(({ textContent }) => textContent)).toEqual(COLLEGES.map(({ name }) => name));
  });

  it("places the date-specific eatability panel before the full directory controls", () => {
    const root = document.createElement("main");
    renderDashboard(root, view(), actions());
    const panel = root.querySelector(".eatability-panel");
    const controls = root.querySelector(".directory-controls");
    expect(panel).not.toBeNull();
    expect(panel!.compareDocumentPosition(controls!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens a college through a descriptive row button", () => {
    const root = document.createElement("main");
    const handlers = actions();
    renderDashboard(root, view(), handlers);
    const churchill = root.querySelector<HTMLButtonElement>('[data-college="churchill"]');
    expect(churchill?.getAttribute("aria-label")).toBe("Open Churchill College dining details for Wednesday, 12 August 2026");
    churchill?.click();
    expect(handlers.openCollege).toHaveBeenCalledWith("churchill");
  });

  it("wires search, evidence filters, sorting, and Clear filters without changing the date", () => {
    const root = document.createElement("main");
    const handlers = actions();
    renderDashboard(root, view(), handlers);
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = "wolfson";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    const serving = root.querySelector<HTMLInputElement>('input[name="serving"]')!;
    serving.checked = true;
    serving.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector<HTMLButtonElement>('button[data-sort="access"]')!.click();

    expect(handlers.setQuery).toHaveBeenCalledWith("wolfson");
    expect(handlers.setFilter).toHaveBeenCalledWith("serving", true);
    expect(handlers.sortBy).toHaveBeenCalledWith("access");
    expect(handlers.selectDate).not.toHaveBeenCalled();
  });

  it("shows active-filter empty results and a working Clear filters action", () => {
    const root = document.createElement("main");
    const handlers = actions();
    renderDashboard(root, view({ options: { ...DEFAULT_TABLE_OPTIONS, query: "not a college", serving: true } }), handlers);
    expect(root.textContent).toContain("No colleges match the active search and filters.");
    root.querySelector<HTMLButtonElement>('button[name="clear-filters"]')?.click();
    expect(handlers.clearFilters).toHaveBeenCalledOnce();
  });

  it("keeps loading and error rows readable without colour", () => {
    const state = dashboard();
    state.colleges.churchill = { status: "loading", college: "churchill", collegeName: "Churchill College" };
    state.colleges.fitzwilliam = { status: "error", college: "fitzwilliam", collegeName: "Fitzwilliam College", message: "Source unavailable", sourceLinks: [] };
    const root = document.createElement("main");
    renderDashboard(root, view({ dashboard: state }), actions());
    expect(root.querySelector('tr[data-college-row="churchill"]')?.textContent).toContain("Loading…");
    expect(root.querySelector('tr[data-college-row="fitzwilliam"]')?.textContent).toContain("Unavailable");
  });

  it("renders the selected college dialog while making the directory inert", () => {
    const root = document.createElement("main");
    renderDashboard(root, view({ selectedCollege: "churchill" }), actions());
    expect(root.querySelector("dialog")?.textContent).toContain("Churchill College");
    expect(root.querySelector<HTMLElement>(".directory-content")?.inert).toBe(true);
  });

  it("renders real directory and sources navigation and the secondary view", () => {
    const root = document.createElement("main");
    renderDashboard(root, view({ view: "sources" }), actions());
    expect(root.querySelector('a[href="?view=directory"]')).not.toBeNull();
    expect(root.querySelector('a[href="?view=sources"]')?.getAttribute("aria-current")).toBe("page");
    expect(root.querySelectorAll("[data-source-college]")).toHaveLength(31);
    expect(root.querySelector("table")).toBeNull();
  });
});
