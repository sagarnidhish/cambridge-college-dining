import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readPagesWorkflow() {
  return readFileSync(resolve(".github/workflows/pages.yml"), "utf8");
}
