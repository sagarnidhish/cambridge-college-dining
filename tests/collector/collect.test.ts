import { afterEach, describe, expect, it, vi } from "vitest";
import { collect } from "../../scripts/collect-dining.mjs";
import { SCHEDULED_SOURCES } from "../../scripts/collector/catalog.mjs";
import { scheduledSnapshotFixture } from "../fixtures/snapshot";
import { CHRISTS_SCHEDULE_HTML, CLARE_HALL_SCHEDULE_HTML, CLARE_SCHEDULE_HTML, CORPUS_SCHEDULE_HTML, ROBINSON_SCHEDULE_HTML } from "../fixtures/scheduled-pages";

const HTML: Record<string, string> = {
  christs: CHRISTS_SCHEDULE_HTML,
  clare: CLARE_SCHEDULE_HTML,
  "clare-hall": CLARE_HALL_SCHEDULE_HTML,
  "corpus-christi": CORPUS_SCHEDULE_HTML,
  robinson: ROBINSON_SCHEDULE_HTML
};

function publicFetch(overrides: Record<string, string> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const source = SCHEDULED_SOURCES.find(({ url }) => url === String(input));
    if (source === undefined) throw new Error(`unexpected ${String(input)}`);
    const id = String(source.id);
    const html = overrides[id] ?? HTML[id] ?? "<html><h1>Official dining information</h1></html>";
    return {
      ok: true,
      status: 200,
      url: source.url,
      headers: new Headers({ "Content-Type": "text/html" }),
      text: async () => html,
      body: { cancel: async () => undefined }
    } as unknown as Response;
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("scheduled collection", () => {
  it("publishes weekly services only after guarded source parsing", async () => {
    vi.stubGlobal("fetch", publicFetch());
    const result = await collect(scheduledSnapshotFixture(), "2026-08-12T09:00:00.000Z");

    expect(result.colleges.robinson).toMatchObject({ coverage: "schedule", collectedAt: "2026-08-12T09:00:00.000Z" });
    expect(result.colleges.robinson.weeklyServices).toHaveLength(3);
    expect(result.colleges["clare-hall"].weeklyServices.every((service: any) => service.availability === "unknown")).toBe(true);
    expect(result.colleges.emmanuel.coverage).toBe("link-only");
  });

  it("retains last-good parsed services and records a warning when parser structure drifts", async () => {
    vi.stubGlobal("fetch", publicFetch());
    const previous = await collect(scheduledSnapshotFixture(), "2026-08-12T09:00:00.000Z");
    vi.stubGlobal("fetch", publicFetch({ robinson: "<html><p>Information moved.</p></html>" }));
    const result = await collect(previous, "2026-08-13T09:00:00.000Z");

    expect(result.colleges.robinson.weeklyServices).toEqual(previous.colleges.robinson.weeklyServices);
    expect(result.colleges.robinson.collectedAt).toBe("2026-08-12T09:00:00.000Z");
    expect(result.colleges.robinson.warning).toMatch(/Collection failed:.*structure/i);
  });
});
