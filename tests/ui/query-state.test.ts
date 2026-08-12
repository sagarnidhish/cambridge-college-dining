import { afterEach, describe, expect, it } from "vitest";
import { collegeFromLocation, setCollegeInHistory, urlWithCollege, urlWithView, viewFromLocation } from "../../src/ui/query-state";

afterEach(() => history.replaceState({}, "", "/"));

describe("college query state", () => {
  it("accepts only canonical college IDs", () => {
    expect(collegeFromLocation(new URL("https://example.test/?college=churchill"))).toBe("churchill");
    expect(collegeFromLocation(new URL("https://example.test/?college=not-a-college"))).toBeNull();
  });

  it("adds and removes only the college parameter", () => {
    const location = new URL("https://example.test/path/?date=2026-08-12&view=directory#table");
    const open = urlWithCollege(location, "gonville-caius");
    expect(open.searchParams.get("college")).toBe("gonville-caius");
    expect(open.searchParams.get("date")).toBe("2026-08-12");
    expect(open.hash).toBe("#table");
    const closed = urlWithCollege(open, null);
    expect(closed.searchParams.has("college")).toBe(false);
    expect(closed.searchParams.get("view")).toBe("directory");
  });

  it("writes push and replace history without changing the current path", () => {
    history.replaceState({}, "", "/college-app/?view=directory");
    setCollegeInHistory("churchill", "push");
    expect(location.pathname).toBe("/college-app/");
    expect(new URL(location.href).searchParams.get("college")).toBe("churchill");
    setCollegeInHistory(null, "replace");
    expect(new URL(location.href).searchParams.get("college")).toBeNull();
    expect(new URL(location.href).searchParams.get("view")).toBe("directory");
  });

  it("accepts only the two canonical views and preserves the college selection", () => {
    expect(viewFromLocation(new URL("https://example.test/?view=sources"))).toBe("sources");
    expect(viewFromLocation(new URL("https://example.test/?view=unknown"))).toBe("directory");
    expect(urlWithView(new URL("https://example.test/?college=churchill"), "sources").searchParams.get("college")).toBe("churchill");
  });
});
