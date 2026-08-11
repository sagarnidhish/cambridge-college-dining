import { addIsoDays, weekdayForIso } from "../domain/dates";
import { closedMeal, createUnknownDiningDay, unknownMeal } from "../domain/meals";
import {
  MEAL_TYPES,
  type Availability,
  type DiningDay,
  type IsoDate,
  type MealRecord,
  type MealType,
  type SourceLink
} from "../domain/types";
import { htmlLines, normalizeWhitespace, type WordPressPage, type WordPressPost } from "./wordpress";

const ST_EDMUNDS_NAME = "St Edmund's College";
const WEEKDAY_BY_NAME: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};
const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

export interface StEdmundsScheduleEntry {
  meal: MealType;
  weekdays: number[];
  time: string;
}

export interface StEdmundsSchedule {
  entries: StEdmundsScheduleEntry[];
  sourceUrl: string;
}

export interface ServiceOverride {
  dates: IsoDate[];
  meal: MealType;
  availability: Availability;
  time: string | null;
  note: string;
}

function normalizeTime(value: string): string | null {
  const match = value.match(
    /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i
  );
  if (match === null || match[1] === undefined || match[2] === undefined || match[4] === undefined || match[5] === undefined) {
    return null;
  }

  const start = normalizeClock(match[1], match[2], match[3]);
  const end = normalizeClock(match[4], match[5], match[6]);
  return start === null || end === null ? null : `${start}–${end}`;
}

function normalizeClock(hourText: string, minuteText: string, meridiem: string | undefined): string | null {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (minute > 59) {
    return null;
  }

  const normalizedMeridiem = meridiem?.replace(/\./g, "").toLowerCase();
  const normalizedHour = normalizedMeridiem === undefined
    ? hour
    : hour >= 1 && hour <= 12
      ? (hour % 12) + (normalizedMeridiem === "pm" ? 12 : 0)
      : -1;
  if (normalizedHour < 0 || normalizedHour > 23) {
    return null;
  }

  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function mealFrom(value: string): MealType | null {
  const match = value.match(/\b(breakfast|brunch|lunch|dinner)\b/i);
  if (match === null || match[1] === undefined) {
    return null;
  }

  const meal = match[1].toLowerCase() as MealType;
  return MEAL_TYPES.includes(meal) ? meal : null;
}

function weekdaysFrom(value: string): number[] {
  const normalized = value.toLowerCase();
  const weekdays = new Set<number>();

  if (/\b(?:mon|monday)\s*(?:-|–|—|to)\s*(?:fri|friday)\b/.test(normalized)) {
    for (let weekday = 1; weekday <= 5; weekday += 1) {
      weekdays.add(weekday);
    }
  }

  for (const [name, weekday] of Object.entries(WEEKDAY_BY_NAME)) {
    const shortName = name.slice(0, 3);
    if (new RegExp(`\\b(?:${name}|${shortName})(?:s)?\\b`).test(normalized)) {
      weekdays.add(weekday);
    }
  }

  return [...weekdays].sort((first, second) => first - second);
}

function parseStEdmundsSchedule(cateringPage: WordPressPage): StEdmundsSchedule {
  const document = new DOMParser().parseFromString(cateringPage.content.rendered, "text/html");
  const entries: StEdmundsScheduleEntry[] = [];

  for (const row of document.querySelectorAll("tr")) {
    const cells = Array.from(row.cells).map((cell) => normalizeWhitespace(cell.textContent ?? ""));
    const combined = cells.join(" ");
    const meal = mealFrom(combined);
    const time = normalizeTime(combined);
    const weekdayCell = cells.find((cell) => weekdaysFrom(cell).length > 0) ?? "";
    const weekdays = weekdaysFrom(weekdayCell);
    if (meal !== null && (time === null || weekdays.length === 0)) {
      throw new Error("St Edmund's recurring timetable is incomplete");
    }
    if (meal === null || time === null || weekdays.length === 0) {
      continue;
    }

    entries.push({ meal, weekdays, time });
  }

  if (entries.length === 0) {
    throw new Error("St Edmund's recurring timetable is incomplete");
  }

  return { entries, sourceUrl: cateringPage.link };
}

function dateFromParts(year: number, monthIndex: number, day: number): IsoDate | null {
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) {
    return null;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` as IsoDate;
}

function weekStartFrom(post: WordPressPost): IsoDate | null {
  const document = new DOMParser().parseFromString(post.content.rendered, "text/html");
  const text = normalizeWhitespace(`${post.title?.rendered ?? ""} ${document.body.textContent ?? ""}`);
  const match = text.match(/week\s+commencing\s*:?[\s]*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?/i);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }

  const month = MONTH_INDEX[match[2].toLowerCase()];
  if (month === undefined) {
    return null;
  }
  if (match[3] !== undefined) {
    return dateFromParts(Number(match[3]), month, Number(match[1]));
  }

  const timestamp = publishedTimestamp(post);
  if (timestamp === Number.MIN_SAFE_INTEGER) {
    return null;
  }
  const referenceYear = new Date(timestamp).getUTCFullYear();
  const candidates = [referenceYear - 1, referenceYear, referenceYear + 1]
    .flatMap((year) => {
      const candidate = dateFromParts(year, month, Number(match[1]));
      return candidate === null ? [] : [candidate];
    })
    .sort((first, second) => {
      const firstDistance = Math.abs(Date.parse(first) - timestamp);
      const secondDistance = Math.abs(Date.parse(second) - timestamp);
      return firstDistance - secondDistance || first.localeCompare(second);
    });
  return candidates[0] ?? null;
}

function matchingWeeklyPost(posts: WordPressPost[], selectedDate: IsoDate): { post: WordPressPost; weekStart: IsoDate } | null {
  const matchingPosts = posts.flatMap((post) => {
    const weekStart = weekStartFrom(post);
    return weekStart !== null && selectedDate >= weekStart && selectedDate <= addIsoDays(weekStart, 6)
      ? [{ post, weekStart }]
      : [];
  });
  matchingPosts.sort((first, second) => {
    const firstPublished = publishedTimestamp(first.post);
    const secondPublished = publishedTimestamp(second.post);
    return secondPublished - firstPublished || second.post.id - first.post.id;
  });
  return matchingPosts[0] ?? null;
}

function publishedTimestamp(post: WordPressPost): number {
  const published = Date.parse(post.date);
  if (!Number.isNaN(published)) {
    return published;
  }
  const modified = Date.parse(post.modified);
  return Number.isNaN(modified) ? Number.MIN_SAFE_INTEGER : modified;
}

function weekDate(weekStart: IsoDate, day: number, monthIndex: number): IsoDate | null {
  const weekEnd = addIsoDays(weekStart, 6);
  const year = Number(weekStart.slice(0, 4));
  for (const candidateYear of [year - 1, year, year + 1]) {
    const candidate = dateFromParts(candidateYear, monthIndex, day);
    if (candidate !== null && candidate >= weekStart && candidate <= weekEnd) {
      return candidate;
    }
  }
  return null;
}

function isoDatesForRange(value: string, weekStart: IsoDate): IsoDate[] {
  const match = value.match(/(\d{1,2})\/(\d{1,2})(?:\s*(?:-|–|—)\s*(\d{1,2})\/(\d{1,2}))?/);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return [];
  }

  const start = weekDate(weekStart, Number(match[1]), Number(match[2]) - 1);
  if (start === null) {
    return [];
  }
  const end = match[3] === undefined || match[4] === undefined
    ? start
    : dateFromParts(
        Number(start.slice(0, 4)) + (Number(match[4]) - 1 < Number(match[2]) - 1 ? 1 : 0),
        Number(match[4]) - 1,
        Number(match[3])
      );
  if (end === null || end < start || end > addIsoDays(weekStart, 6)) {
    return [];
  }

  const dates: IsoDate[] = [];
  for (let date = start; date <= end; date = addIsoDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function serviceDetails(value: string): Omit<ServiceOverride, "dates" | "note"> | null {
  const meal = mealFrom(value);
  if (meal === null || !/\bservice\b/i.test(value)) {
    return null;
  }

  if (/\bno\s+(?:breakfast|brunch|lunch|dinner)\s+service\b/i.test(value)) {
    return { meal, availability: "closed", time: null };
  }

  const time = normalizeTime(value);
  return time === null ? null : { meal, availability: "available", time };
}

function serviceOverrides(post: WordPressPost, weekStart: IsoDate): ServiceOverride[] {
  const document = new DOMParser().parseFromString(post.content.rendered, "text/html");
  const lines = Array.from(document.querySelectorAll("p, li")).flatMap(htmlLines);
  const overrides: ServiceOverride[] = [];
  let pendingDates: IsoDate[] = [];

  for (const line of lines) {
    const dates = isoDatesForRange(line, weekStart);
    const details = serviceDetails(line);
    if (dates.length > 0 && details !== null) {
      overrides.push({ ...details, dates, note: line });
      pendingDates = [];
      continue;
    }
    if (dates.length > 0 && mealFrom(line) !== null && /\bservice\b/i.test(line)) {
      throw new Error("St Edmund's dated service override is incomplete");
    }
    if (dates.length > 0) {
      pendingDates = dates;
      continue;
    }
    if (pendingDates.length > 0 && details !== null) {
      overrides.push({ ...details, dates: pendingDates, note: line });
      pendingDates = [];
    } else if (pendingDates.length > 0 && mealFrom(line) !== null && /\bservice\b/i.test(line)) {
      throw new Error("St Edmund's dated service override is incomplete");
    }
  }

  return overrides;
}

function sourceLinks(cateringPage: WordPressPage, weeklyPost: WordPressPost | null): SourceLink[] {
  const links: SourceLink[] = [{ label: "St Edmund's catering information", url: cateringPage.link }];
  const document = new DOMParser().parseFromString(cateringPage.content.rendered, "text/html");
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const label = normalizeWhitespace(anchor.textContent ?? "");
    if (/^https?:\/\//i.test(anchor.href) && label && !links.some((link) => link.url === anchor.href)) {
      links.push({ label, url: anchor.href });
    }
  }
  if (weeklyPost !== null && !links.some((link) => link.url === weeklyPost.link)) {
    links.push({ label: "St Edmund's weekly catering menu", url: weeklyPost.link });
  }
  return links;
}

function menuPdfs(post: WordPressPost): Partial<Record<"lunch" | "dinner", MealRecord["menu"]>> {
  const document = new DOMParser().parseFromString(post.content.rendered, "text/html");
  const menus: Partial<Record<"lunch" | "dinner", MealRecord["menu"]>> = {};
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const label = normalizeWhitespace(anchor.textContent ?? "");
    const meal = mealFrom(label);
    if ((meal !== "lunch" && meal !== "dinner") || !/\.pdf(?:$|[?#])/i.test(anchor.href)) {
      continue;
    }
    menus[meal] = {
      kind: "pdf",
      label: `Open official ${meal} menu PDF`,
      url: anchor.href
    };
  }
  return menus;
}

function weeklyNotices(post: WordPressPost, weekStart: IsoDate, selectedDate: IsoDate): string[] {
  const document = new DOMParser().parseFromString(post.content.rendered, "text/html");
  const notices: string[] = [];
  let pendingDates: IsoDate[] = [];

  for (const element of document.querySelectorAll("p, li")) {
    const withoutPdfs = element.cloneNode(true) as Element;
    withoutPdfs.querySelectorAll('a[href*=".pdf"]').forEach((anchor) => anchor.remove());
    const evidenceLines = htmlLines(withoutPdfs);
    const displayLines = htmlLines(element);

    for (const [index, line] of evidenceLines.entries()) {
      if (/^week\s+commencing\b/i.test(line)) {
        pendingDates = [];
        continue;
      }
      const displayLine = displayLines[index] ?? line;
      const dates = isoDatesForRange(line, weekStart);
      if (dates.length > 0) {
        pendingDates = dates;
        if (!/^\s*\d{1,2}\/\d{1,2}(?:\s*(?:-|–|—)\s*\d{1,2}\/\d{1,2})?\s*$/.test(line)) {
          if (pendingDates.includes(selectedDate)) {
            notices.push(displayLine);
          }
          pendingDates = [];
        }
        continue;
      }
      if (pendingDates.length > 0) {
        if (pendingDates.includes(selectedDate)) {
          notices.push(displayLine);
        }
        pendingDates = [];
        continue;
      }
      notices.push(displayLine);
    }
  }

  return notices;
}

function weekdayNumber(selectedDate: IsoDate): number {
  const weekday = weekdayForIso(selectedDate).toLowerCase();
  return WEEKDAY_BY_NAME[weekday] ?? 0;
}

function scheduledMeal(type: MealType, time: string, links: SourceLink[]): MealRecord {
  return { ...unknownMeal(type), availability: "available", time, sourceLinks: links };
}

export function parseStEdmundsDay(
  posts: WordPressPost[],
  cateringPage: WordPressPage,
  selectedDate: IsoDate,
  fetchedAt: string
): DiningDay {
  const schedule = parseStEdmundsSchedule(cateringPage);
  const weekly = matchingWeeklyPost(posts, selectedDate);
  const links = sourceLinks(cateringPage, weekly?.post ?? null);
  const day = createUnknownDiningDay({
    college: "st-edmunds",
    collegeName: ST_EDMUNDS_NAME,
    date: selectedDate,
    sourceLinks: links,
    fetchedAt
  });
  const weekday = weekdayNumber(selectedDate);
  const regularEntries = schedule.entries.filter((entry) => entry.weekdays.includes(weekday));

  if (weekly === null) {
    const meals = { ...day.meals };
    for (const entry of regularEntries) {
      meals[entry.meal] = {
        ...unknownMeal(entry.meal),
        time: `Normally ${entry.time}`,
        menu: { kind: "message", message: "Menu not published for this date" },
        sourceLinks: links
      };
    }
    return {
      ...day,
      meals,
      sourceModifiedAt: cateringPage.modified,
      notices: ["Recurring timetable only; no matching weekly menu is published for this date."]
    };
  }

  const meals = {} as Record<MealType, MealRecord>;
  for (const type of MEAL_TYPES) {
    meals[type] = closedMeal(type);
  }
  for (const entry of regularEntries) {
    meals[entry.meal] = scheduledMeal(entry.meal, entry.time, links);
  }

  const menus = menuPdfs(weekly.post);
  for (const type of ["lunch", "dinner"] as const) {
    if (menus[type] !== undefined && meals[type].availability === "available") {
      meals[type] = { ...meals[type], menu: menus[type] };
    }
  }

  for (const override of serviceOverrides(weekly.post, weekly.weekStart)) {
    if (!override.dates.includes(selectedDate)) {
      continue;
    }
    const prior = meals[override.meal];
    meals[override.meal] = override.availability === "closed"
      ? { ...closedMeal(override.meal), notes: [override.note], sourceLinks: links }
      : {
          ...(prior.availability === "closed" ? scheduledMeal(override.meal, override.time ?? "Time not published", links) : prior),
          availability: "available",
          time: override.time ?? prior.time,
          notes: [override.note],
          sourceLinks: links
        };
  }

  return {
    ...day,
    meals,
    notices: weeklyNotices(weekly.post, weekly.weekStart, selectedDate),
    sourceModifiedAt: weekly.post.modified
  };
}
