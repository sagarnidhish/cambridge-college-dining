import { describe, expect, it } from "vitest";
import { SCHEDULED_SOURCES } from "../../scripts/collector/catalog.mjs";
import { parseScheduledSource } from "../../scripts/collector/parsers.mjs";
import {
  CHRISTS_SCHEDULE_HTML,
  CLARE_HALL_SCHEDULE_HTML,
  CLARE_SCHEDULE_HTML,
  CORPUS_SCHEDULE_HTML,
  ROBINSON_SCHEDULE_HTML
} from "../fixtures/scheduled-pages";

const at = "2026-08-12T08:00:00.000Z";

function source(id: string) {
  const value = SCHEDULED_SOURCES.find((entry) => entry.id === id);
  if (value === undefined) throw new Error(`missing ${id}`);
  return value;
}

describe("guarded scheduled-source parsers", () => {
  it.each([
    ["corpus-christi", CORPUS_SCHEDULE_HTML, 4],
    ["robinson", ROBINSON_SCHEDULE_HTML, 3]
  ])("parses %s only after recognizing its current timetable structure", (id, html, count) => {
    const result = parseScheduledSource(source(id), html, at);
    expect(result.coverage).toBe("schedule");
    expect(result.weeklyServices).toHaveLength(count);
    expect(result.weeklyServices.every((service: any) => service.availability === "available")).toBe(true);
    expect(result.weeklyServices.every((service: any) => service.serviceWindow.source.url === source(id).url)).toBe(true);
  });

  it.each([
    ["christs", CHRISTS_SCHEDULE_HTML, 4],
    ["clare", CLARE_SCHEDULE_HTML, 4]
  ])("keeps %s hours unknown when the page does not establish exact applicable dates", (id, html, count) => {
    const result = parseScheduledSource(source(id), html, at);
    expect(result.weeklyServices).toHaveLength(count);
    expect(result.weeklyServices.every((service: any) => service.availability === "unknown")).toBe(true);
    expect(result.weeklyServices.every((service: any) => service.serviceWindow.kind === "unknown")).toBe(true);
    expect(result.warning).toMatch(/applicable dates/i);
  });

  it("keeps Clare Hall normal hours unknown because event closures live in another current menu", () => {
    const result = parseScheduledSource(source("clare-hall"), CLARE_HALL_SCHEDULE_HTML, at);
    expect(result.weeklyServices).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "lunch", availability: "unknown", time: "Normally 12:00–13:30" }),
      expect.objectContaining({ type: "dinner", availability: "unknown", time: "Normally 18:00–19:00" })
    ]));
    expect(result.warning).toMatch(/event closures/i);
  });

  it.each(["christs", "clare", "clare-hall", "corpus-christi", "robinson"])("rejects %s parser drift", (id) => {
    expect(() => parseScheduledSource(source(id), "<html><h1>Dining</h1><p>Information moved.</p></html>", at)).toThrow(/structure/i);
  });
});
