import { describe, expect, it } from "vitest";
import { parseStEdmundsDay } from "../../src/sources/st-edmunds";
import {
  ST_EDMUNDS_CATERING_FIXTURE,
  ST_EDMUNDS_LIVE_CATERING_FIXTURE,
  ST_EDMUNDS_LIVE_POST_FIXTURE,
  ST_EDMUNDS_POST_FIXTURES
} from "../fixtures/st-edmunds";

describe("parseStEdmundsDay", () => {
  it("combines recurring service with the applicable weekly PDFs", () => {
    const day = parseStEdmundsDay(
      ST_EDMUNDS_POST_FIXTURES,
      ST_EDMUNDS_CATERING_FIXTURE,
      "2026-08-11",
      "2026-08-11T21:35:12.000Z"
    );
    expect(day).toMatchObject({
      college: "st-edmunds",
      freshness: "live",
      coverage: "menu",
      access: { classification: "unknown" },
      location: { diningArea: "Dining Hall" }
    });
    expect(day.meals.breakfast.availability).toBe("closed");
    expect(day.meals.lunch.time).toBe("12:30–13:30");
    expect(day.meals.lunch.menu[0]).toMatchObject({ kind: "pdf", label: "Open official lunch menu PDF" });
    expect(day.meals.dinner.menu[0]).toMatchObject({ kind: "pdf", label: "Open official dinner menu PDF" });
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

  it("keeps split-line date exceptions scoped to their paragraph date", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p>13/08<br>Dinner Service: 18:00 - 18:45</p><p>14/08–15/08<br>Lunch Service: 12:00 - 13:00</p>"
      }
    };

    const applicable = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-13", "2026-08-11T21:35:12.000Z");
    const unrelated = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-12", "2026-08-11T21:35:12.000Z");
    const ranged = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-15", "2026-08-11T21:35:12.000Z");

    expect(applicable.meals.dinner.notes).toContain("Dinner Service: 18:00 - 18:45");
    expect(applicable.notices).toContain("Dinner Service: 18:00 - 18:45");
    expect(unrelated.notices).not.toContain("Dinner Service: 18:00 - 18:45");
    expect(ranged.meals.lunch.notes).toContain("Lunch Service: 12:00 - 13:00");
    expect(ranged.notices).toContain("Lunch Service: 12:00 - 13:00");
  });

  it("scopes adjacent dated notice blocks to the date that introduced each block", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p>13/08</p><p>Dinner Service: 18:00 - 18:45</p><p>14/08</p><p>Lunch Service: 12:00 - 13:00</p>"
      }
    };

    const thirteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-13", "2026-08-11T21:35:12.000Z");
    const fourteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-14", "2026-08-11T21:35:12.000Z");
    const unrelated = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-12", "2026-08-11T21:35:12.000Z");

    expect(thirteenth.notices).toContain("Dinner Service: 18:00 - 18:45");
    expect(thirteenth.notices).not.toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).not.toContain("Dinner Service: 18:00 - 18:45");
    expect(unrelated.notices).not.toContain("Dinner Service: 18:00 - 18:45");
    expect(unrelated.notices).not.toContain("Lunch Service: 12:00 - 13:00");
  });

  it("does not union-scope later service lines after multiple date blocks in one paragraph", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p>13/08<br>Dinner Service: 18:00 - 18:45<br>14/08<br>Lunch Service: 12:00 - 13:00</p>"
      }
    };

    const thirteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-13", "2026-08-11T21:35:12.000Z");
    const fourteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-14", "2026-08-11T21:35:12.000Z");

    expect(thirteenth.notices).toContain("Dinner Service: 18:00 - 18:45");
    expect(thirteenth.notices).not.toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).not.toContain("Dinner Service: 18:00 - 18:45");
  });

  it("keeps PDF-only lines from shifting contextual notice dates", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p>13/08<br>Dinner Service: 18:00 - 18:45<br><a href=\"https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/notice.pdf\">Official notice PDF</a><br>14/08<br>Lunch Service: 12:00 - 13:00<br>Please book a table with the Catering team.</p>"
      }
    };

    const thirteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-13", "2026-08-11T21:35:12.000Z");
    const fourteenth = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-14", "2026-08-11T21:35:12.000Z");
    const unrelated = parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-12", "2026-08-11T21:35:12.000Z");

    for (const day of [thirteenth, fourteenth, unrelated]) {
      expect(day.notices).toContain("Please book a table with the Catering team.");
      expect(day.notices.join(" ")).not.toContain("Official notice PDF");
    }
    expect(thirteenth.notices).toContain("Dinner Service: 18:00 - 18:45");
    expect(thirteenth.notices).not.toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).toContain("Lunch Service: 12:00 - 13:00");
    expect(fourteenth.notices).not.toContain("Dinner Service: 18:00 - 18:45");
    expect(unrelated.notices).not.toContain("Dinner Service: 18:00 - 18:45");
    expect(unrelated.notices).not.toContain("Lunch Service: 12:00 - 13:00");
  });

  it("rejects a recurring timetable with no recognizable service entries", () => {
    const cateringPage = {
      ...ST_EDMUNDS_CATERING_FIXTURE,
      content: {
        protected: false,
        rendered: "<table><tr><th>Opening information</th><th>Weekdays</th><th>See staff notice</th></tr><tr><td>Dining hall</td><td>Monday–Friday</td><td>Contact catering</td></tr></table>"
      }
    };

    expect(() => parseStEdmundsDay(ST_EDMUNDS_POST_FIXTURES, cateringPage, "2026-08-11", "2026-08-11T21:35:12.000Z"))
      .toThrow("St Edmund's recurring timetable is incomplete");
  });

  it("rejects a matched weekly schedule with a malformed recurring service row", () => {
    const cateringPage = {
      ...ST_EDMUNDS_CATERING_FIXTURE,
      content: {
        protected: false,
        rendered: "<table><tr><td>Monday–Friday</td><td>Lunch</td><td>midday</td></tr></table>"
      }
    };

    expect(() => parseStEdmundsDay(ST_EDMUNDS_POST_FIXTURES, cateringPage, "2026-08-11", "2026-08-11T21:35:12.000Z"))
      .toThrow("St Edmund's recurring timetable is incomplete");
  });

  it("rejects a matched weekly post with an unparseable dated service override", () => {
    const currentWeek = ST_EDMUNDS_POST_FIXTURES[1]!;
    const post = {
      ...currentWeek,
      content: {
        protected: false,
        rendered: "<p>Week Commencing 10 August 2026</p><p>13/08 Dinner Service: late</p>"
      }
    };

    expect(() => parseStEdmundsDay([post], ST_EDMUNDS_CATERING_FIXTURE, "2026-08-13", "2026-08-11T21:35:12.000Z"))
      .toThrow("St Edmund's dated service override is incomplete");
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
    expect(day.meals.lunch.menu).toEqual([{ kind: "message", message: "Menu not published for this date" }]);
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
    expect(day.meals.dinner.menu).toEqual([{ kind: "message", message: "Menu not published" }]);
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

    expect(day.meals.lunch.menu[0]).toMatchObject({ kind: "pdf", url: "https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/newer-lunch.pdf" });
    expect(day.sourceModifiedAt).toBe("2026-08-11T12:00:00");
  });

  it("keeps live 12-hour Tuesday service rows as normalized recurring slots", () => {
    const day = parseStEdmundsDay([], ST_EDMUNDS_LIVE_CATERING_FIXTURE, "2026-08-11", "2026-08-11T21:35:12.000Z");

    expect(day.meals.lunch).toMatchObject({ availability: "unknown", time: "Normally 12:30–13:30" });
    expect(day.meals.dinner).toMatchObject({ availability: "unknown", time: "Normally 18:30–19:45" });
  });

  it("matches a yearless live weekly heading from its publication date, attaches both official PDFs, and retains its dated override", () => {
    const day = parseStEdmundsDay(
      [ST_EDMUNDS_LIVE_POST_FIXTURE],
      ST_EDMUNDS_LIVE_CATERING_FIXTURE,
      "2026-08-11",
      "2026-08-11T21:35:12.000Z"
    );

    expect(day.meals.lunch).toMatchObject({
      availability: "available",
      time: "12:30–13:30",
      menu: [{ kind: "pdf", url: "https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/live-week-lunch.pdf" }]
    });
    expect(day.meals.dinner).toMatchObject({
      availability: "available",
      time: "18:30–19:45",
      menu: [{ kind: "pdf", url: "https://www.st-edmunds.cam.ac.uk/wp-content/uploads/2026/08/live-week-dinner.pdf" }]
    });

    const exceptionDay = parseStEdmundsDay(
      [ST_EDMUNDS_LIVE_POST_FIXTURE],
      ST_EDMUNDS_LIVE_CATERING_FIXTURE,
      "2026-08-13",
      "2026-08-11T21:35:12.000Z"
    );
    expect(exceptionDay.meals.dinner).toMatchObject({
      availability: "available",
      time: "18:00–18:45",
      notes: ["13/08 Dinner Service: 6:00pm – 6:45pm"]
    });
  });

  it("normalizes midnight and noon in the live 12-hour timetable syntax", () => {
    const cateringPage = {
      ...ST_EDMUNDS_LIVE_CATERING_FIXTURE,
      content: {
        protected: false,
        rendered: ST_EDMUNDS_LIVE_CATERING_FIXTURE.content.rendered.replace("12:30pm – 1:30pm", "12:00am – 12:00pm")
      }
    };

    const day = parseStEdmundsDay([], cateringPage, "2026-08-16", "2026-08-11T21:35:12.000Z");

    expect(day.meals.lunch).toMatchObject({ availability: "unknown", time: "Normally 00:00–12:00" });
  });
});
