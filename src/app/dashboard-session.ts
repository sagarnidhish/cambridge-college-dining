import { parseChurchillDay } from "../sources/churchill";
import { fetchChurchillSnapshot, fetchStEdmundsSnapshot, type ChurchillSnapshot, type StEdmundsSnapshot } from "../sources/fetch";
import { parseStEdmundsDay } from "../sources/st-edmunds";
import { loadCachedDay, saveCachedDay } from "../storage/cache";
import type { CollegeId, CollegeViewState, DashboardState, DiningDay, IsoDate, SourceLink } from "../domain/types";

export interface DashboardSession {
  refresh(selectedDate: IsoDate): Promise<DashboardState>;
  selectDate(selectedDate: IsoDate): DashboardState;
}

interface RetainedSnapshot<T> {
  source: T;
  fetchedAt: string;
}

const collegeNames: Record<CollegeId, string> = {
  churchill: "Churchill College",
  "st-edmunds": "St Edmund's College"
};

const sourceLinks: Record<CollegeId, SourceLink[]> = {
  churchill: [{ label: "Churchill lunch and dinner menu", url: "https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/" }],
  "st-edmunds": [{ label: "St Edmund's catering", url: "https://www.st-edmunds.cam.ac.uk/student-life/catering/" }]
};

function errorState(college: CollegeId): CollegeViewState {
  return {
    status: "error",
    college,
    collegeName: collegeNames[college],
    message: `Live ${collegeNames[college]} dining data could not be loaded.`,
    sourceLinks: sourceLinks[college]
  };
}

export function createDashboardSession(deps: {
  fetchImpl: typeof fetch;
  storage: Storage;
  now: () => Date;
}): DashboardSession {
  let churchillSnapshot: RetainedSnapshot<ChurchillSnapshot> | null = null;
  let stEdmundsSnapshot: RetainedSnapshot<StEdmundsSnapshot> | null = null;

  function cacheReady(day: DiningDay): CollegeViewState {
    saveCachedDay(deps.storage, day);
    return { status: "ready", day };
  }

  function cachedOrError(college: CollegeId, selectedDate: IsoDate): CollegeViewState {
    const day = loadCachedDay(deps.storage, college, selectedDate);
    return day === null ? errorState(college) : { status: "ready", day };
  }

  function normalizeChurchill(selectedDate: IsoDate, snapshot: RetainedSnapshot<ChurchillSnapshot> | null): CollegeViewState {
    if (snapshot === null) {
      return cachedOrError("churchill", selectedDate);
    }
    try {
      return cacheReady(parseChurchillDay(snapshot.source.page, selectedDate, snapshot.fetchedAt));
    } catch {
      return cachedOrError("churchill", selectedDate);
    }
  }

  function normalizeStEdmunds(selectedDate: IsoDate, snapshot: RetainedSnapshot<StEdmundsSnapshot> | null): CollegeViewState {
    if (snapshot === null) {
      return cachedOrError("st-edmunds", selectedDate);
    }
    try {
      const { posts, cateringPage } = snapshot.source;
      return cacheReady(parseStEdmundsDay(posts, cateringPage, selectedDate, snapshot.fetchedAt));
    } catch {
      return cachedOrError("st-edmunds", selectedDate);
    }
  }

  function stateFor(
    selectedDate: IsoDate,
    snapshots = { churchill: churchillSnapshot, "st-edmunds": stEdmundsSnapshot }
  ): DashboardState {
    return {
      selectedDate,
      colleges: {
        churchill: normalizeChurchill(selectedDate, snapshots.churchill),
        "st-edmunds": normalizeStEdmunds(selectedDate, snapshots["st-edmunds"])
      }
    };
  }

  return {
    async refresh(selectedDate) {
      const [churchillResult, stEdmundsResult] = await Promise.allSettled([
        fetchChurchillSnapshot(deps.fetchImpl),
        fetchStEdmundsSnapshot(deps.fetchImpl)
      ]);
      const refreshedChurchill = churchillResult.status === "fulfilled"
        ? { source: churchillResult.value, fetchedAt: deps.now().toISOString() }
        : null;
      const refreshedStEdmunds = stEdmundsResult.status === "fulfilled"
        ? { source: stEdmundsResult.value, fetchedAt: deps.now().toISOString() }
        : null;
      if (refreshedChurchill !== null) {
        churchillSnapshot = refreshedChurchill;
      }
      if (refreshedStEdmunds !== null) {
        stEdmundsSnapshot = refreshedStEdmunds;
      }
      return stateFor(selectedDate, { churchill: refreshedChurchill, "st-edmunds": refreshedStEdmunds });
    },
    selectDate(selectedDate) {
      return stateFor(selectedDate);
    }
  };
}
