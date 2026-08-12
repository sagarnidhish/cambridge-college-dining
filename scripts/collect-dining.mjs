import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SCHEDULED_SOURCES } from "./collector/catalog.mjs";
import { mergeCollection } from "./collector/merge.mjs";
import { validateSnapshot } from "./collector/validate.mjs";

const USER_AGENT = "cambridge-college-dining/0.2 (+https://github.com/sagarnidhish/cambridge-college-dining)";

function argumentsFrom(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if ((key !== "--previous" && key !== "--output") || value === undefined) throw new Error("Usage: collect-dining.mjs --previous <path> --output <path>");
    result[key.slice(2)] = value;
  }
  if (typeof result.previous !== "string" || typeof result.output !== "string") throw new Error("Usage: collect-dining.mjs --previous <path> --output <path>");
  return result;
}

async function validateLink(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      credentials: "omit",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" },
      signal: controller.signal
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (new URL(response.url).protocol !== "https:") throw new Error("Redirected to a non-HTTPS URL");
    return { ok: true };
  } catch (error) {
    return { ok: false, warning: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function boundedMap(values, concurrency, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export async function collect(previousValue, collectedAt = new Date().toISOString()) {
  const previous = validateSnapshot(previousValue);
  const results = await boundedMap(SCHEDULED_SOURCES, 2, validateLink);
  const attempts = new Map();
  for (let index = 0; index < SCHEDULED_SOURCES.length; index += 1) {
    const source = SCHEDULED_SOURCES[index];
    const result = results[index];
    if (source === undefined || result === undefined) throw new Error("Collector result alignment failure");
    if (result.ok) {
      attempts.set(source.id, { ok: true, record: { ...previous.colleges[source.id], collectedAt } });
      process.stdout.write(`OK ${source.name}: ${source.url}\n`);
    } else {
      attempts.set(source.id, { ok: false, warning: result.warning });
      process.stdout.write(`CARRY ${source.name}: ${result.warning}\n`);
    }
  }
  return mergeCollection(previous, attempts, collectedAt);
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const previousPath = resolve(args.previous);
  const outputPath = resolve(args.output);
  const previous = JSON.parse(await readFile(previousPath, "utf8"));
  const merged = await collect(previous);
  const temporary = `${outputPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(merged, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  await rename(temporary, outputPath);
  process.stdout.write(`WROTE ${outputPath}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
