import { describe, expect, it, vi } from "vitest";
import type { DashboardSession } from "../../src/app/dashboard-session";
import type { DashboardState, IsoDate } from "../../src/domain/types";
import { mountDashboard } from "../../src/ui/mount";

const today = "2026-08-11" as const;
const selectedDate = "2026-08-12" as const;

function state(date: IsoDate = today): DashboardState {
  return {
    selectedDate: date,
    colleges: {
      churchill: { status: "error", college: "churchill", collegeName: "Churchill College", message: "Unavailable", sourceLinks: [{ label: "Official", url: "https://www.chu.cam.ac.uk/" }] },
      "st-edmunds": { status: "error", college: "st-edmunds", collegeName: "St Edmund's College", message: "Unavailable", sourceLinks: [{ label: "Official", url: "https://www.st-edmunds.cam.ac.uk/" }] }
    }
  };
}

function sessionFor(initial = state()): DashboardSession & { refresh: ReturnType<typeof vi.fn>; selectDate: ReturnType<typeof vi.fn> } {
  return {
    refresh: vi.fn(async (date) => state(date)),
    selectDate: vi.fn((date) => state(date))
  };
}

async function mounted(session = sessionFor()) {
  const root = document.createElement("main");
  await mountDashboard(root, session, () => new Date("2026-08-11T12:00:00.000Z"));
  return root;
}

describe("mountDashboard", () => {
  it("refreshes Cambridge today once when mounted", async () => {
    const session = sessionFor();
    await mounted(session);

    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(session.refresh).toHaveBeenCalledWith(today);
  });

  it("selects adjacent calendar days from previous and next controls", async () => {
    const session = sessionFor();
    const root = await mounted(session);
    root.querySelector<HTMLButtonElement>('button[name="previous"]')?.click();
    root.querySelector<HTMLButtonElement>('button[name="next"]')?.click();

    expect(session.selectDate).toHaveBeenNthCalledWith(1, "2026-08-10");
    expect(session.selectDate).toHaveBeenNthCalledWith(2, "2026-08-11");
  });

  it("selects Cambridge today and an exact valid date-input value", async () => {
    const session = sessionFor();
    const root = await mounted(session);
    root.querySelector<HTMLButtonElement>('button[name="today"]')?.click();
    const input = root.querySelector<HTMLInputElement>('input[type="date"]');
    if (input === null) throw new Error("date input missing");
    input.value = selectedDate;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(session.selectDate).toHaveBeenNthCalledWith(1, today);
    expect(session.selectDate).toHaveBeenNthCalledWith(2, selectedDate);
  });

  it("refreshes the current selected date after date navigation", async () => {
    const session = sessionFor();
    const root = await mounted(session);
    root.querySelector<HTMLButtonElement>('button[name="next"]')?.click();
    root.querySelector<HTMLButtonElement>('button[name="refresh"]')?.click();
    await vi.waitFor(() => expect(session.refresh).toHaveBeenCalledTimes(2));

    expect(session.refresh).toHaveBeenLastCalledWith(selectedDate);
  });

  it("keeps date and refresh controls available when a college is in error", async () => {
    const root = await mounted(sessionFor());

    expect(root.querySelector<HTMLButtonElement>('button[name="previous"]')?.disabled).toBe(false);
    expect(root.querySelector<HTMLInputElement>('input[type="date"]')?.disabled).toBe(false);
    expect(root.querySelector<HTMLButtonElement>('button[name="refresh"]')?.disabled).toBe(false);
  });

  it("keeps keyboard focus on the activated control after rerendering", async () => {
    const root = await mounted(sessionFor());
    document.body.append(root);
    try {
      const next = root.querySelector<HTMLButtonElement>('button[name="next"]');
      if (next === null) throw new Error("next button missing");

      next.focus();
      next.click();

      expect(document.activeElement).toBe(root.querySelector('button[name="next"]'));
    } finally {
      root.remove();
    }
  });

  it("keeps the latest same-date refresh on screen when an older refresh resolves afterwards", async () => {
    const resolvers: Array<(value: DashboardState) => void> = [];
    const session: DashboardSession = {
      selectDate: (date) => state(date),
      refresh: (date) => new Promise((resolve) => resolvers.push(resolve))
    };
    const root = document.createElement("main");
    const mount = mountDashboard(root, session, () => new Date("2026-08-11T12:00:00.000Z"));
    resolvers.shift()?.(state(today));
    await mount;

    root.querySelector<HTMLButtonElement>('button[name="refresh"]')?.click();
    root.querySelector<HTMLButtonElement>('button[name="refresh"]')?.click();
    resolvers[1]?.({
      ...state(today),
      colleges: { ...state(today).colleges, churchill: { status: "error", college: "churchill", collegeName: "Churchill College", message: "Newer result", sourceLinks: [] } }
    });
    await vi.waitFor(() => expect(root.textContent).toContain("Newer result"));
    resolvers[0]?.({
      ...state(today),
      colleges: { ...state(today).colleges, churchill: { status: "error", college: "churchill", collegeName: "Churchill College", message: "Older result", sourceLinks: [] } }
    });
    await Promise.resolve();

    expect(root.textContent).toContain("Newer result");
    expect(root.textContent).not.toContain("Older result");
  });
});
