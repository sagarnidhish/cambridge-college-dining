import type { DashboardSession } from "../app/dashboard-session";
import { addIsoDays, isIsoDate, todayInCambridge } from "../domain/dates";
import type { DashboardState, IsoDate, LiveCollegeId } from "../domain/types";
import { renderDashboard, type DashboardActions } from "./render";

const collegeNames: Record<LiveCollegeId, string> = {
  churchill: "Churchill College",
  "st-edmunds": "St Edmund's College"
};

function loadingState(selectedDate: IsoDate): DashboardState {
  return {
    selectedDate,
    colleges: {
      churchill: { status: "loading", college: "churchill", collegeName: collegeNames.churchill },
      "st-edmunds": { status: "loading", college: "st-edmunds", collegeName: collegeNames["st-edmunds"] }
    }
  };
}

export async function mountDashboard(
  root: HTMLElement,
  session: DashboardSession,
  now: () => Date = () => new Date()
): Promise<void> {
  let selectedDate = todayInCambridge(now());
  let currentState = loadingState(selectedDate);
  let refreshGeneration = 0;

  const render = (): void => renderDashboard(root, currentState, actions);

  const selectDate = (date: IsoDate): void => {
    selectedDate = date;
    currentState = session.selectDate(selectedDate);
    render();
  };

  const refresh = async (): Promise<void> => {
    const generation = ++refreshGeneration;
    const dateToRefresh = selectedDate;
    currentState = loadingState(dateToRefresh);
    render();
    try {
      const refreshed = await session.refresh(dateToRefresh);
      if (generation === refreshGeneration) {
        currentState = selectedDate === dateToRefresh ? refreshed : session.selectDate(selectedDate);
        render();
      }
    } catch {
      if (generation === refreshGeneration && selectedDate === dateToRefresh) {
        currentState = session.selectDate(dateToRefresh);
        render();
      }
    }
  };

  const actions: DashboardActions = {
    previousDate: () => selectDate(addIsoDays(selectedDate, -1)),
    nextDate: () => selectDate(addIsoDays(selectedDate, 1)),
    selectToday: () => selectDate(todayInCambridge(now())),
    selectDate: (value) => {
      if (isIsoDate(value)) {
        selectDate(value);
      } else {
        render();
      }
    },
    refresh: () => {
      void refresh();
    }
  };

  await refresh();
}
