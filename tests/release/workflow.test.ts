import { describe, expect, it } from "vitest";
import { readPagesWorkflow } from "../../scripts/workflow-source.mjs";

describe("Pages workflow", () => {
  const workflow = readPagesWorkflow();

  it("collects before verification and deploys on a daily schedule", () => {
    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("cron: '17 5 * * *'");
    expect(workflow.indexOf("npm run collect")).toBeLessThan(workflow.indexOf("npm run verify"));
    expect(workflow.indexOf("npm run verify")).toBeLessThan(workflow.indexOf("npm run validate:dist"));
  });

  it("keeps least-privilege Pages deployment and never commits collection output", () => {
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("pages: write");
    expect(workflow).toContain("id-token: write");
    expect(workflow).not.toMatch(/git (?:commit|push)/);
  });
});
