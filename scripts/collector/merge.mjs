import { SCHEDULED_COLLEGE_IDS } from "./catalog.mjs";
import { validateCollegeAttempt, validateSnapshot } from "./validate.mjs";

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
      const record = validateCollegeAttempt(structuredClone(attempt.record));
      if (record.college !== id) throw new Error(`Collection record key mismatch for ${id}`);
      merged.colleges[id] = record;
    } else {
      const warning = typeof attempt.warning === "string" && attempt.warning.trim() !== "" ? attempt.warning.trim() : "Unknown collection failure";
      merged.colleges[id] = {
        ...merged.colleges[id],
        warning: `Collection failed: ${warning}. Last known-good record retained.`
      };
    }
  }
  return validateSnapshot(merged);
}
