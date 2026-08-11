import { describe, expect, it } from "vitest";
import { parseStEdmundsDay } from "../../src/sources/st-edmunds";
import { ST_EDMUNDS_CATERING_FIXTURE, ST_EDMUNDS_POST_FIXTURES } from "../fixtures/st-edmunds";

describe("parseStEdmundsDay", () => {
  it("combines recurring service with the applicable weekly PDFs", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-11",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.breakfast.availability).toBe("closed");
    expect(day.meals.lunch.time).toBe("12:30–13:30");
    expect(day.meals.lunch.menu).toMatchObject({ kind: "pdf", label: "Open official lunch menu PDF" });
    expect(day.meals.dinner.menu).toMatchObject({ kind: "pdf", label: "Open official dinner menu PDF" });
  });

  it("applies a dated timing exception and keeps its note visible", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-13",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.dinner.time).toBe("18:00–18:45");
    expect(day.meals.dinner.notes.join(" ")).toContain("13/08 Dinner Service");
  });

  it("renders Saturday brunch and explicit regular closures", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-15",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.brunch).toMatchObject({ availability: "available", time: "11:00–12:30" });
    expect(day.meals.lunch.availability).toBe("closed");
    expect(day.meals.dinner.availability).toBe("closed");
  });

  it("does not attach an unmatched weekly menu to another date", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-09-01",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day.meals.lunch.availability).toBe("unknown");
    expect(day.meals.lunch.time).toBe("Normally 12:30–13:30");
    expect(day.meals.lunch.menu).toEqual({ kind: "message", message: "Menu not published for this date" });
    expect(day.notices).toContain("Recurring timetable only; no matching weekly menu is published for this date.");
  });

  it("preserves a selected-day notice when its paragraph also links to a PDF", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        ...currentWeek.content,
        rendered: `${currentWeek.content.rendered}<p>14/08 No Dinner Service <a href="https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/notice.pdf">Official notice PDF</a></p>`
      }
    };

    const day = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-14", "2026-08-11T21:35:12.000Z");

    expect(day.notices).toContain("14/08 No Dinner Service Official notice PDF");
  });

  it("gives an exceptional normally closed service an unpublished menu state", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        ...currentWeek.content,
        rendered: `${currentWeek.content.rendered}<p>16/08 Dinner Service: 18:00 - 19:00</p>`
      }
    };

    const day = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-16", "2026-08-11T21:35:12.000Z");

    expect(day.meals.dinner).toMatchObject({ availability: "available", time: "18:00–19:00" });
    expect(day.meals.dinner.menu).toEqual({ kind: "message", message: "Menu not published" });
  });

  it("applies January exceptions from a week commencing in December", () => {
    const decemberPost = {
      ...ST_EDMUNDS_POST_FIXTURES[1]!,
      id: 510,
      date: "2026-12-28T08:00:00",
      modified: "2026-12-28T08:00:00",
      link: "https://www.st-edmunds.cam.ac.uk/week-commencing-28-december-2026/",
      title: { rendered: "Week Commencing 28 December 2026" },
      content: {
        protected: false,
        rendered: "<p>Week Commencing 28 December 2026</p><p>01/01 No Dinner Service</p>"
      }
    };

    const day = parseStEdmundsDay([decemberPost], ST_EDMUNDS_CATERING_FIXTURE, "2027-01-01", "2026-12-28T21:35:12.000Z");

    expect(day.meals.dinner.availability).toBe("closed");
    expect(day.meals.dinner.notes).toContain("01/01 No Dinner Service");
  });

  it("selects the newest applicable weekly post regardless of array order", () => {
    const olderPost = {
      ...ST_EDMUNDS_POST_FIXTURES[1]!,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p><a href=\"https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/older-lunch.pdf\">Older Lunch Menu</a></p>"
      }
    };
    const newerPost = {
      ...olderPost,
      id: 512,
      date: "2026-08-11T12:00:00",
      modified: "2026-08-11T12:00:00",
      link: "https://www.st-edmunds.cam.ac.uk/week-commencing-10-august-2026-correction/",
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p><a href=\"https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/newer-lunch.pdf\">Newer Lunch Menu</a></p>"
      }
    };

    const day = parseStEdmundsDay(
      [olderPost, newerPost],
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-11",
      "2026-08-11T21:35:12.000Z"
    );

    expect(day.meals.lunch.menu).toMatchObject({ kind: "pdf", url: "https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/newer-lunch.pdf" });
    expect(day.sourceModifiedAt).toBe("2026-08-11T12:00:00");
  });
});
