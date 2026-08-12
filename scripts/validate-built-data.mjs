import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateSnapshot } from "./collector/validate.mjs";

export async function validateBuiltData(root = "dist") {
  const path = resolve(root, "data/college-dining.json");
  const value = JSON.parse(await readFile(path, "utf8"));
  return validateSnapshot(value);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  validateBuiltData().then((snapshot) => {
    process.stdout.write(`PASS built data: ${Object.keys(snapshot.colleges).length} scheduled colleges\n`);
  }).catch((error) => {
    process.stderr.write(`FAIL built data: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
