import { COLLEGE_IDS, type CollegeId } from "../domain/types";

type LocationLike = URL | Pick<Location, "href">;
export type AppView = "directory" | "sources";

function asUrl(location: LocationLike): URL {
  return location instanceof URL ? new URL(location.href) : new URL(location.href);
}

export function collegeFromLocation(location: LocationLike): CollegeId | null {
  const value = asUrl(location).searchParams.get("college");
  return value !== null && COLLEGE_IDS.includes(value as CollegeId) ? value as CollegeId : null;
}

export function urlWithCollege(location: LocationLike, college: CollegeId | null): URL {
  const url = asUrl(location);
  if (college === null) url.searchParams.delete("college");
  else url.searchParams.set("college", college);
  return url;
}

export function setCollegeInHistory(college: CollegeId | null, mode: "push" | "replace"): void {
  const url = urlWithCollege(window.location, college);
  const target = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") window.history.pushState({}, "", target);
  else window.history.replaceState({}, "", target);
}

export function viewFromLocation(location: LocationLike): AppView {
  return asUrl(location).searchParams.get("view") === "sources" ? "sources" : "directory";
}

export function urlWithView(location: LocationLike, view: AppView): URL {
  const url = asUrl(location);
  url.searchParams.set("view", view);
  return url;
}
