import { addIsoDays, weekdayForIso } from "../domain/dates";
import { closedMeal, createUnknownDiningDay, unknownMeal } from "../domain/meals";
import { MEAL_TYPES, type DiningDay, type IsoDate, type MealRecord, type MealType, type MenuContent, type SourceLink } from "../domain/types";
import { htmlLines, normalizeWhitespace, type WordPressPage } from "./wordpress";

const CHURCHILL_NAME = "Churchill College";
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};
const SERVICE_LINE = /^(Breakfast|Brunch|Lunch|Dinner)\s*[-–—]\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/i;

function isoDate(year: number, monthIndex: number, day: number): IsoDate | null {
  const parsed = new Date(Date.UTC(year, monthIndex, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) {
    return null;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` as IsoDate;
}

function weekStartFrom(document: Document): IsoDate | null {
  const match = normalizeWhitespace(document.body.textContent ?? "").match(
    /Week commencing:\s*(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})/i
  );
  if (match === null) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  if (dayText === undefined || monthText === undefined || yearText === undefined) {
    return null;
  }

  const month = MONTH_INDEX[monthText.toLowerCase()];
  return month === undefined ? null : isoDate(Number(yearText), month, Number(dayText));
}

function tableDate(firstCell: HTMLTableCellElement, weekStart: IsoDate): IsoDate | null {
  const heading = normalizeWhitespace(firstCell.textContent ?? "");
  const match = heading.match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)$/i
  );
  if (match === null) {
    return null;
  }

  const [, weekdayText, dayText, monthText] = match;
  if (weekdayText === undefined || dayText === undefined || monthText === undefined) {
    return null;
  }

  const weekday = `${weekdayText[0]?.toUpperCase()}${weekdayText.slice(1).toLowerCase()}`;
  const month = MONTH_INDEX[monthText.toLowerCase()];
  if (!WEEKDAY_NAMES.includes(weekday) || month === undefined) {
    return null;
  }

  const matches = Array.from({ length: 7 }, (_, offset) => addIsoDays(weekStart, offset)).filter((candidate) => {
    const [year, candidateMonth, candidateDay] = candidate.split("-").map(Number);
    return (
      year !== undefined &&
      candidateMonth === month + 1 &&
      candidateDay === Number(dayText) &&
      weekdayForIso(candidate) === weekday
    );
  });

  return matches.length === 1 ? matches[0] ?? null : null;
}

function menuFrom(cell: HTMLTableCellElement): MealRecord["menu"] {
  const items = htmlLines(cell)
    .map((line) => line.replace(/^\*\s*/, "").replace(/\u2019/g, "'"))
    .filter(Boolean);

  return items.length === 0 ? { kind: "message", message: "Menu not published" } : { kind: "items", items };
}

function scheduledMeal(type: MealType, time: string, sourceLinks: SourceLink[]): MealRecord {
  return {
    ...unknownMeal(type),
    availability: "available",
    time,
    sourceLinks
  };
}

function publishedNotices(document: Document): string[] {
  return Array.from(document.querySelectorAll("p"))
    .flatMap(htmlLines)
    .filter((line) => /^Please note:/i.test(line));
}

export function parseChurchillDay(page: WordPressPage, selectedDate: IsoDate, fetchedAt: string): DiningDay<MenuContent> {
  const sourceLinks = [{ label: "Churchill lunch and dinner menu", url: page.link }];
  const unknownDay = createUnknownDiningDay({
    college: "churchill",
    collegeName: CHURCHILL_NAME,
    date: selectedDate,
    sourceLinks,
    fetchedAt
  });
  const document = new DOMParser().parseFromString(page.content.rendered, "text/html");
  const weekStart = weekStartFrom(document);
  if (weekStart === null) {
    return {
      ...unknownDay,
      sourceModifiedAt: page.modified,
      notices: [...publishedNotices(document), "No Churchill schedule is published for this date."]
    };
  }

  for (const table of document.querySelectorAll<HTMLTableElement>("figure.wp-block-table table")) {
    const header = table.rows.item(0);
    const firstCell = header?.cells.item(0);
    if (firstCell === null || firstCell === undefined || tableDate(firstCell, weekStart) !== selectedDate) {
      continue;
    }

    const meals = {} as Record<MealType, MealRecord>;
    for (const type of MEAL_TYPES) {
      meals[type] = closedMeal(type);
    }

    const scheduleRow = table.rows.item(1);
    const scheduleCell = scheduleRow?.cells.item(0);
    if (scheduleCell === null || scheduleCell === undefined) {
      throw new Error("Churchill timetable is incomplete");
    }
    const timetableLines = htmlLines(scheduleCell).filter((line) => /\b(?:breakfast|brunch|lunch|dinner)\b/i.test(line));
    if (timetableLines.length === 0) {
      throw new Error("Churchill timetable is incomplete");
    }
    for (const line of timetableLines) {
        const match = line.match(SERVICE_LINE);
        if (match === null) {
          throw new Error("Churchill timetable is incomplete");
        }

        const [, label, start, end] = match;
        const type = label?.toLowerCase() as MealType | undefined;
        if (type === undefined || !MEAL_TYPES.includes(type) || start === undefined || end === undefined) {
          throw new Error("Churchill timetable is incomplete");
        }

        meals[type] = scheduledMeal(type, `${start}–${end}`, sourceLinks);
    }

    const lunchCell = scheduleRow?.cells.item(1);
    const dinnerCell = scheduleRow?.cells.item(2);
    if (lunchCell !== null && lunchCell !== undefined && meals.lunch.availability === "available") {
      meals.lunch = { ...meals.lunch, menu: menuFrom(lunchCell) };
    }
    if (dinnerCell !== null && dinnerCell !== undefined && meals.dinner.availability === "available") {
      meals.dinner = { ...meals.dinner, menu: menuFrom(dinnerCell) };
    }

    return {
      college: "churchill",
      collegeName: CHURCHILL_NAME,
      date: selectedDate,
      weekday: weekdayForIso(selectedDate),
      timeZone: "Europe/London",
      meals,
      notices: publishedNotices(document),
      sourceLinks,
      sourceModifiedAt: page.modified,
      fetchedAt,
      freshness: "live"
    };
  }

  return {
    ...unknownDay,
    sourceModifiedAt: page.modified,
    notices: [...publishedNotices(document), "No Churchill schedule is published for this date."]
  };
}
