import { describe, expect, it } from "vitest";
import { appendPageCounter } from "../../src/ui/counter";

describe("page-load counter", () => {
  it("uses an isolated labelled HTTPS image", () => {
    const root = document.createElement("footer");
    appendPageCounter(root);
    const image = root.querySelector<HTMLImageElement>(".page-counter img")!;
    expect(image.alt).toContain("Page loads");
    expect(new URL(image.src).protocol).toBe("https:");
  });

  it("leaves the application usable when the counter image fails", () => {
    const root = document.createElement("main");
    root.append(document.createElement("table"));
    appendPageCounter(root);
    root.querySelector<HTMLImageElement>(".page-counter img")!.dispatchEvent(new Event("error"));
    expect(root.textContent).toContain("Page-load count unavailable");
    expect(root.querySelector("table")).not.toBeNull();
  });
});
