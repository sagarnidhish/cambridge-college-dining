import { SCHEDULED_COLLEGE_IDS } from "./catalog.mjs";
import { validateCollegeAttempt, validateSnapshot } from "./validate.mjs";

const COLLECTION_FAILURE = "Collection failed:";

function editorialWarning(value) {
  if (typeof value !== "string") return undefined;
  const marker = value.indexOf(COLLECTION_FAILURE);
  const editorial = (marker === -1 ? value : value.slice(0, marker)).trim();
  return editorial === "" ? undefined : editorial;
}

function withoutCollectionFailure(record) {
  const cleaned = structuredClone(record);
  const warning = editorialWarning(cleaned.warning);
  if (warning === undefined) delete cleaned.warning;
  else cleaned.warning = warning;
  return cleaned;
}

export function mergeCollection(previousValue, attempts, collectedAt) {
  const previous = validateSnapshot(structuredClone(previousValue));
  const merged = structuredClone(previous);
  merged.collectedAt = collectedAt;
  for (const id of attempts.keys()) {
    if (!SCHEDULED_COLLEGE_IDS.includes(id)) throw new Error(`Unknown collection attempt: ${id}`);
  }
  for (const id of SCHEDULED_COLLEGE_IDS) {
    const attempt = attempts.get(id);
    if (attempt === undefined) continue;
    if (attempt.ok === true) {
      if (attempt.record === undefined) throw new Error(`Successful collection is missing a record for ${id}`);
      const record = validateCollegeAttempt(withoutCollectionFailure(attempt.record));
      if (record.college !== id) throw new Error(`Collection record key mismatch for ${id}`);
      merged.colleges[id] = record;
    } else {
      const warning = typeof attempt.warning === "string" && attempt.warning.trim() !== "" ? attempt.warning.trim() : "Unknown collection failure";
      const editorial = editorialWarning(merged.colleges[id].warning);
      merged.colleges[id] = {
        ...merged.colleges[id],
        warning: `${editorial === undefined ? "" : `${editorial} `}Collection failed: ${warning}. Last known-good record retained.`
      };
    }
  }
  return validateSnapshot(merged);
}
