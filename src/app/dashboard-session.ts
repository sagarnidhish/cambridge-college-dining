import { COLLEGES, collegeById } from "../domain/catalog";
import type { CollegeId, CollegeViewState, DashboardState, DiningDay, IsoDate } from "../domain/types";
import { parseChurchillDay } from "../sources/churchill";
import { parseDarwinDay } from "../sources/darwin";
import { parseDowningDay } from "../sources/downing";
import {
  fetchChurchillSnapshot,
  fetchDarwinSnapshot,
  fetchDowningSnapshot,
  fetchScheduledSnapshot,
  fetchStEdmundsSnapshot,
  type ChurchillSnapshot,
  type DarwinSnapshot,
  type DowningSnapshot,
  type StEdmundsSnapshot
} from "../sources/fetch";
import { parseStEdmundsDay } from "../sources/st-edmunds";
import { scheduledDayFor } from "../snapshots/normalize";
import type { ScheduledSnapshot } from "../snapshots/schema";
import { loadCachedDay, saveCachedDay } from "../storage/cache";

export interface DashboardSession {
  refresh(selectedDate: IsoDate): Promise<DashboardState>;
  selectDate(selectedDate: IsoDate): DashboardState;
}

interface RetainedSnapshot<T> {
  source: T;
  fetchedAt: string;
}

interface SourceSet {
  churchill: RetainedSnapshot<ChurchillSnapshot> | null;
  darwin: RetainedSnapshot<DarwinSnapshot> | null;
  downing: RetainedSnapshot<DowningSnapshot> | null;
  "st-edmunds": RetainedSnapshot<StEdmundsSnapshot> | null;
  scheduled: ScheduledSnapshot | null;
}

function errorState(college: CollegeId): CollegeViewState {
  const profile = collegeById(college);
  return {
    status: "error",
    college,
    collegeName: profile.name,
    message: `Current ${profile.name} dining data could not be loaded.`,
    sourceLinks: profile.sources
  };
}

export function createDashboardSession(deps: {
  fetchImpl: typeof fetch;
  storage: Storage;
  now: () => Date;
}): DashboardSession {
  let retained: SourceSet = { churchill: null, darwin: null, downing: null, "st-edmunds": null, scheduled: null };
  let refreshGeneration = 0;

  function cacheReady(day: DiningDay, persist: boolean): CollegeViewState {
    if (persist) saveCachedDay(deps.storage, day);
    return { status: "ready", day };
  }

  function cachedOrError(college: CollegeId, date: IsoDate): CollegeViewState {
    const cached = loadCachedDay(deps.storage, college, date);
    return cached === null ? errorState(college) : { status: "ready", day: cached };
  }

  function directState<T>(
    college: CollegeId,
    date: IsoDate,
    snapshot: RetainedSnapshot<T> | null,
    persist: boolean,
    parse: (source: T, date: IsoDate, fetchedAt: string) => DiningDay
  ): CollegeViewState {
    if (snapshot === null) return cachedOrError(college, date);
    try {
      return cacheReady(parse(snapshot.source, date, snapshot.fetchedAt), persist);
    } catch {
      return cachedOrError(college, date);
    }
  }

  function scheduledState(college: CollegeId, date: IsoDate, snapshot: ScheduledSnapshot | null, persist: boolean): CollegeViewState {
    if (snapshot === null) return cachedOrError(college, date);
    try {
      return cacheReady(scheduledDayFor(snapshot, collegeById(college), date), persist);
    } catch {
      return cachedOrError(college, date);
    }
  }

  function stateFor(date: IsoDate, sources: SourceSet = retained, persist = true): DashboardState {
    const colleges = {} as DashboardState["colleges"];
    for (const profile of COLLEGES) {
      if (profile.id === "churchill") {
        colleges[profile.id] = directState(profile.id, date, sources.churchill, persist, (source, selected, at) => parseChurchillDay(source.page, selected, at));
      } else if (profile.id === "darwin") {
        colleges[profile.id] = directState(profile.id, date, sources.darwin, persist, parseDarwinDay);
      } else if (profile.id === "downing") {
        colleges[profile.id] = directState(profile.id, date, sources.downing, persist, parseDowningDay);
      } else if (profile.id === "st-edmunds") {
        colleges[profile.id] = directState(profile.id, date, sources["st-edmunds"], persist, (source, selected, at) =>
          parseStEdmundsDay(source.posts, source.cateringPage, selected, at));
      } else {
        colleges[profile.id] = scheduledState(profile.id, date, sources.scheduled, persist);
      }
    }
    return { selectedDate: date, colleges };
  }

  const stamp = <T>(source: T): RetainedSnapshot<T> => ({ source, fetchedAt: deps.now().toISOString() });

  return {
    async refresh(selectedDate) {
      const generation = ++refreshGeneration;
      const [churchill, darwin, downing, stEdmunds, scheduled] = await Promise.allSettled([
        fetchChurchillSnapshot(deps.fetchImpl).then(stamp),
        fetchDarwinSnapshot(deps.fetchImpl).then(stamp),
        fetchDowningSnapshot(deps.fetchImpl).then(stamp),
        fetchStEdmundsSnapshot(deps.fetchImpl).then(stamp),
        fetchScheduledSnapshot(deps.fetchImpl)
      ]);
      if (generation !== refreshGeneration) return stateFor(selectedDate, retained, false);

      const current: SourceSet = {
        churchill: churchill.status === "fulfilled" ? churchill.value : null,
        darwin: darwin.status === "fulfilled" ? darwin.value : null,
        downing: downing.status === "fulfilled" ? downing.value : null,
        "st-edmunds": stEdmunds.status === "fulfilled" ? stEdmunds.value : null,
        scheduled: scheduled.status === "fulfilled" ? scheduled.value : null
      };
      retained = {
        churchill: current.churchill ?? retained.churchill,
        darwin: current.darwin ?? retained.darwin,
        downing: current.downing ?? retained.downing,
        "st-edmunds": current["st-edmunds"] ?? retained["st-edmunds"],
        scheduled: current.scheduled ?? retained.scheduled
      };
      return stateFor(selectedDate, current);
    },
    selectDate(selectedDate) {
      return stateFor(selectedDate);
    }
  };
}
