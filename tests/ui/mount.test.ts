import { describe, expect, it, vi } from "vitest";
import type { DashboardSession } from "../../src/app/dashboard-session";
import { COLLEGES } from "../../src/domain/catalog";
import type { CollegeViewState, DashboardState, IsoDate } from "../../src/domain/types";
import { mountDashboard } from "../../src/ui/mount";

const today = "2026-08-11" as const;

function state(date: IsoDate): DashboardState {
  return {
    selectedDate: date,
    colleges: Object.fromEntries(COLLEGES.map((profile) => [profile.id, {
      status: "error",
      college: profile.id,
      collegeName: profile.name,
      message: "Unavailable",
      sourceLinks: profile.sources
    } satisfies CollegeViewState])) as DashboardState["colleges"]
  };
}

function session(): DashboardSession & { refresh: ReturnType<typeof vi.fn>; selectDate: ReturnType<typeof vi.fn> } {
  return {
    refresh: vi.fn(async (date: IsoDate) => state(date)),
    selectDate: vi.fn((date: IsoDate) => state(date))
  };
}

async function mounted(source = session()) {
  const root = document.createElement("main");
  await mountDashboard(root, source, () => new Date("2026-08-11T12:00:00.000Z"));
  return root;
}

describe("mountDashboard", () => {
  it("refreshes Cambridge today once and keeps 31 rows visible", async () => {
    const source = session();
    const root = await mounted(source);
    expect(source.refresh).toHaveBeenCalledOnce();
    expect(source.refresh).toHaveBeenCalledWith(today);
    expect(root.querySelectorAll("tbody tr")).toHaveLength(31);
  });

  it("selects adjacent days and refreshes the current date", async () => {
    const source = session();
    const root = await mounted(source);
    root.querySelector<HTMLButtonElement>('button[name="next"]')!.click();
    root.querySelector<HTMLButtonElement>('button[name="refresh"]')!.click();
    await vi.waitFor(() => expect(source.refresh).toHaveBeenCalledTimes(2));
    expect(source.selectDate).toHaveBeenCalledWith("2026-08-12");
    expect(source.refresh).toHaveBeenLastCalledWith("2026-08-12");
  });

  it("applies search and filters while preserving the selected date", async () => {
    const source = session();
    const root = await mounted(source);
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "wolfson";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
    root.querySelector<HTMLInputElement>('input[name="accessUnknown"]')!.click();
    expect(source.selectDate).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe(today);
  });

  it("toggles sort direction and preserves keyboard focus after rerender", async () => {
    const root = await mounted();
    document.body.append(root);
    try {
      const sort = root.querySelector<HTMLButtonElement>('button[data-sort="college"]')!;
      sort.focus();
      sort.click();
      expect(document.activeElement).toBe(root.querySelector('button[data-sort="college"]'));
      expect(root.querySelector('th[data-column="college"]')?.getAttribute("aria-sort")).toBe("descending");
    } finally {
      root.remove();
    }
  });

  it("keeps a newer refresh on screen when an older one resolves last", async () => {
    const resolvers: Array<(value: DashboardState) => void> = [];
    const source: DashboardSession = {
      selectDate: (date) => state(date),
      refresh: (date) => new Promise((resolve) => resolvers.push((value) => resolve(value)))
    };
    const root = document.createElement("main");
    const mounting = mountDashboard(root, source, () => new Date("2026-08-11T12:00:00.000Z"));
    resolvers.shift()?.(state(today));
    await mounting;
    root.querySelector<HTMLButtonElement>('button[name="refresh"]')!.click();
    root.querySelector<HTMLButtonElement>('button[name="refresh"]')!.click();
    const newer = state(today);
    newer.colleges.churchill = { status: "error", college: "churchill", collegeName: "Churchill College", message: "Newer", sourceLinks: [] };
    resolvers[1]?.(newer);
    await vi.waitFor(() => expect(root.textContent).toContain("Newer"));
    const older = state(today);
    older.colleges.churchill = { status: "error", college: "churchill", collegeName: "Churchill College", message: "Older", sourceLinks: [] };
    resolvers[0]?.(older);
    await Promise.resolve();
    expect(root.textContent).toContain("Newer");
    expect(root.textContent).not.toContain("Older");
  });

  it("opens a shareable college dialog, preserves other query state, and restores row focus on close", async () => {
    history.replaceState({}, "", "/?view=directory");
    const root = await mounted();
    document.body.append(root);
    try {
      const row = root.querySelector<HTMLButtonElement>('[data-college="churchill"]')!;
      row.focus();
      row.click();
      expect(new URL(location.href).searchParams.get("college")).toBe("churchill");
      expect(root.querySelector("dialog")?.open).toBe(true);
      root.querySelector<HTMLButtonElement>('dialog button[name="close-details"]')!.click();
      expect(new URL(location.href).searchParams.get("college")).toBeNull();
      expect(new URL(location.href).searchParams.get("view")).toBe("directory");
      expect(document.activeElement).toBe(root.querySelector('[data-college="churchill"]'));
    } finally {
      history.replaceState({}, "", "/");
      root.remove();
    }
  });
});
