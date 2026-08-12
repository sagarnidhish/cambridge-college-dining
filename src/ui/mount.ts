import type { DashboardSession } from "../app/dashboard-session";
import { COLLEGES } from "../domain/catalog";
import { addIsoDays, isIsoDate, todayInCambridge } from "../domain/dates";
import type { CollegeId, DashboardState, IsoDate } from "../domain/types";
import { eatabilityResults } from "../domain/eatability";
import { DEFAULT_TABLE_OPTIONS, type TableOptions } from "./table-model";
import { renderDashboard, type DashboardActions, type DashboardFilter } from "./render";
import { collegeFromLocation, setCollegeInHistory, viewFromLocation, type AppView } from "./query-state";

function loadingState(selectedDate: IsoDate): DashboardState {
  return {
    selectedDate,
    colleges: Object.fromEntries(COLLEGES.map((profile) => [profile.id, {
      status: "loading",
      college: profile.id,
      collegeName: profile.name
    }])) as DashboardState["colleges"]
  };
}

export async function mountDashboard(
  root: HTMLElement,
  session: DashboardSession,
  now: () => Date = () => new Date()
): Promise<void> {
  let selectedDate = todayInCambridge(now());
  let dashboard = loadingState(selectedDate);
  let options: TableOptions = { ...DEFAULT_TABLE_OPTIONS };
  let focusedEatabilityCollege: CollegeId | null = null;
  let selectedCollege: CollegeId | null = collegeFromLocation(window.location);
  let view: AppView = viewFromLocation(window.location);
  let lastSelectedCollege: CollegeId | null = selectedCollege;
  let refreshGeneration = 0;

  const render = (): void => {
    const eligible = eatabilityResults(dashboard);
    if (!eligible.some(({ college }) => college === focusedEatabilityCollege)) {
      focusedEatabilityCollege = eligible.find(({ tier }) => tier === "confirmed")?.college
        ?? eligible.find(({ tier }) => tier === "host-required")?.college
        ?? null;
    }
    renderDashboard(root, { dashboard, options, focusedEatabilityCollege, selectedCollege, view }, actions);
    if (view === "directory" && selectedCollege !== null) root.querySelector<HTMLButtonElement>('dialog button[name="close-details"]')?.focus();
  };

  const selectDate = (date: IsoDate): void => {
    selectedDate = date;
    dashboard = session.selectDate(date);
    render();
  };

  const refresh = async (): Promise<void> => {
    const generation = ++refreshGeneration;
    const dateToRefresh = selectedDate;
    dashboard = loadingState(dateToRefresh);
    render();
    try {
      const refreshed = await session.refresh(dateToRefresh);
      if (generation === refreshGeneration) {
        dashboard = selectedDate === dateToRefresh ? refreshed : session.selectDate(selectedDate);
        render();
      }
    } catch {
      if (generation === refreshGeneration && selectedDate === dateToRefresh) {
        dashboard = session.selectDate(dateToRefresh);
        render();
      }
    }
  };

  const actions: DashboardActions = {
    previousDate: () => selectDate(addIsoDays(selectedDate, -1)),
    nextDate: () => selectDate(addIsoDays(selectedDate, 1)),
    selectToday: () => selectDate(todayInCambridge(now())),
    selectDate: (value) => isIsoDate(value) ? selectDate(value) : render(),
    refresh: () => { void refresh(); },
    setQuery: (value) => { options = { ...options, query: value }; render(); },
    setFilter: (filter: DashboardFilter, checked: boolean) => { options = { ...options, [filter]: checked }; render(); },
    sortBy: (column) => {
      options = options.sort === column
        ? { ...options, direction: options.direction === "asc" ? "desc" : "asc" }
        : { ...options, sort: column, direction: "asc" };
      render();
    },
    clearFilters: () => { options = { ...DEFAULT_TABLE_OPTIONS }; render(); },
    focusEatabilityCollege: (college) => {
      if (eatabilityResults(dashboard).some((result) => result.college === college)) focusedEatabilityCollege = college;
      render();
    },
    openCollege: (college) => {
      selectedCollege = college;
      lastSelectedCollege = college;
      setCollegeInHistory(college, "push");
      render();
    },
    closeCollege: () => {
      const restore = selectedCollege ?? lastSelectedCollege;
      selectedCollege = null;
      setCollegeInHistory(null, "push");
      render();
      if (restore !== null) root.querySelector<HTMLButtonElement>(`[data-college="${restore}"]`)?.focus();
    }
  };

  window.addEventListener("popstate", () => {
    selectedCollege = collegeFromLocation(window.location);
    view = viewFromLocation(window.location);
    if (selectedCollege !== null) lastSelectedCollege = selectedCollege;
    render();
  });

  await refresh();
}
