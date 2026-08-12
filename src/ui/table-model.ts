import { COLLEGES } from "../domain/catalog";
import { MEAL_TYPES, type AccessClass, type CollegeId, type CollegeViewState, type DashboardState, type DiningDay, type MealType, type MenuContent } from "../domain/types";

export type TableSort = "college" | "services" | "next" | "access" | "price" | "freshness";

export interface TableOptions {
  query: string;
  serving: boolean;
  unhosted: boolean;
  menuPublished: boolean;
  accessUnknown: boolean;
  sort: TableSort;
  direction: "asc" | "desc";
}

export const DEFAULT_TABLE_OPTIONS: Readonly<TableOptions> = {
  query: "",
  serving: false,
  unhosted: false,
  menuPublished: false,
  accessUnknown: false,
  sort: "college",
  direction: "asc"
};

export interface NextMealSummary {
  label: string;
  time: string;
  sortMinutes: number;
}

export interface TableRowModel {
  id: CollegeId;
  name: string;
  diningArea: string;
  status: CollegeViewState["status"];
  services: string;
  next: string;
  nextSort: number;
  access: string;
  accessClass: AccessClass;
  price: string;
  priceSort: number;
  freshness: string;
  freshnessSort: number;
  isServing: boolean;
  hasPublishedMenu: boolean;
}

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  brunch: "Brunch",
  lunch: "Lunch",
  dinner: "Dinner"
};

function menuEntries(value: MenuContent | MenuContent[]): MenuContent[] {
  return Array.isArray(value) ? value : [value];
}

function startMinutes(time: string): number | null {
  const match = time.match(/(?:Normally\s+)?(\d{1,2}):(\d{2})/i);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

export function servicesToday(day: DiningDay): string {
  const available = MEAL_TYPES.filter((type) => day.meals[type].availability === "available");
  if (available.length > 0) return available.map((type, index) => index === 0 ? MEAL_LABEL[type] : MEAL_LABEL[type].toLocaleLowerCase("en-GB")).join(", ");
  return MEAL_TYPES.every((type) => day.meals[type].availability === "closed") ? "Closed" : "Not confirmed";
}

export function nextMeal(day: DiningDay, nowMinutes = -1): NextMealSummary {
  const candidates = MEAL_TYPES.flatMap((type) => {
    const meal = day.meals[type];
    const minutes = meal.availability === "available" ? startMinutes(meal.time) : null;
    return minutes !== null && minutes >= nowMinutes ? [{ label: MEAL_LABEL[type], time: meal.time, sortMinutes: minutes }] : [];
  }).sort((left, right) => left.sortMinutes - right.sortMinutes);
  return candidates[0] ?? { label: "No later published service", time: "", sortMinutes: Number.POSITIVE_INFINITY };
}

function accessLabel(value: AccessClass): string {
  if (value === "unhosted-cambridge") return "Confirmed without a host";
  if (value === "guest-required") return "Host or guest arrangement";
  if (value === "members-only") return "Members only";
  return "Access unknown";
}

function freshnessLabel(day: DiningDay): { text: string; rank: number } {
  if (day.freshness === "live") return { text: "Live", rank: 3 };
  if (day.freshness === "scheduled") return { text: "Scheduled snapshot", rank: 2 };
  return { text: "Cached fallback", rank: 1 };
}

function priceValue(day: DiningDay): { text: string; sort: number } {
  const quote = day.prices?.[0];
  if (quote === undefined) return { text: "Price not publicly confirmed", sort: Number.POSITIVE_INFINITY };
  const numeric = Number(quote.amount.match(/\d+(?:\.\d+)?/)?.[0] ?? Number.POSITIVE_INFINITY);
  return { text: `${quote.amount} (${quote.audience})`, sort: numeric };
}

function readyRow(state: Extract<CollegeViewState, { status: "ready" }>): TableRowModel {
  const { day } = state;
  const next = nextMeal(day);
  const freshness = freshnessLabel(day);
  const price = priceValue(day);
  const accessClass = day.access?.classification ?? "unknown";
  return {
    id: day.college,
    name: day.collegeName,
    diningArea: day.location?.diningArea ?? "Dining area not published",
    status: "ready",
    services: servicesToday(day),
    next: next.time === "" ? next.label : `${next.label}, ${next.time}`,
    nextSort: next.sortMinutes,
    access: accessLabel(accessClass),
    accessClass,
    price: price.text,
    priceSort: price.sort,
    freshness: freshness.text,
    freshnessSort: freshness.rank,
    isServing: MEAL_TYPES.some((type) => day.meals[type].availability === "available"),
    hasPublishedMenu: MEAL_TYPES.some((type) => menuEntries(day.meals[type].menu).some(({ kind }) => kind !== "message"))
  };
}

function unavailableRow(profile: (typeof COLLEGES)[number], state: CollegeViewState | undefined): TableRowModel {
  const status = state?.status ?? "error";
  return {
    id: profile.id,
    name: profile.name,
    diningArea: profile.diningArea,
    status,
    services: status === "loading" ? "Loading…" : "Unavailable",
    next: status === "loading" ? "Loading…" : "Unavailable",
    nextSort: Number.POSITIVE_INFINITY,
    access: accessLabel(profile.access.classification),
    accessClass: profile.access.classification,
    price: profile.prices[0]?.amount ?? "Price not publicly confirmed",
    priceSort: Number.POSITIVE_INFINITY,
    freshness: status === "loading" ? "Loading…" : "Source unavailable",
    freshnessSort: 0,
    isServing: false,
    hasPublishedMenu: false
  };
}

function searchText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").trim();
}

function compareRows(left: TableRowModel, right: TableRowModel, options: TableOptions): number {
  if (options.sort !== "college") {
    if (left.status === "error" && right.status !== "error") return 1;
    if (right.status === "error" && left.status !== "error") return -1;
  }
  let comparison = 0;
  if (options.sort === "college") comparison = left.name.localeCompare(right.name, "en-GB");
  else if (options.sort === "services") comparison = Number(left.isServing) - Number(right.isServing);
  else if (options.sort === "next") comparison = left.nextSort - right.nextSort;
  else if (options.sort === "access") comparison = left.access.localeCompare(right.access, "en-GB");
  else if (options.sort === "price") comparison = left.priceSort - right.priceSort;
  else comparison = left.freshnessSort - right.freshnessSort;
  if (!Number.isFinite(comparison)) comparison = Number.isFinite(left.nextSort) || Number.isFinite(left.priceSort) ? -1 : 1;
  if (comparison !== 0) return options.direction === "asc" ? comparison : -comparison;
  return left.name.localeCompare(right.name, "en-GB");
}

export function tableRows(state: DashboardState, options: TableOptions): TableRowModel[] {
  const query = searchText(options.query);
  return COLLEGES.map((profile) => {
    const current = state.colleges[profile.id];
    return current?.status === "ready" ? readyRow(current) : unavailableRow(profile, current);
  }).filter((row) => {
    if (query !== "" && !searchText(`${row.name} ${row.diningArea}`).includes(query)) return false;
    if (options.serving && !row.isServing) return false;
    if (options.unhosted && row.accessClass !== "unhosted-cambridge") return false;
    if (options.menuPublished && !row.hasPublishedMenu) return false;
    if (options.accessUnknown && row.accessClass !== "unknown") return false;
    return true;
  }).sort((left, right) => compareRows(left, right, options));
}
