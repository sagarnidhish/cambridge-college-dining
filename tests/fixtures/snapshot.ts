import { COLLEGES } from "../../src/domain/catalog";
import type { CollegeId, IsoDate, MealRecord, MealType, SnapshotCoverage } from "../../src/domain/types";

export interface SnapshotRecordFixture {
  college: CollegeId;
  coverage: SnapshotCoverage;
  collectedAt: string;
  sourceModifiedAt: string | null;
  validFrom: IsoDate | null;
  validThrough: IsoDate | null;
  mealsByDate: Partial<Record<IsoDate, Partial<Record<MealType, Omit<MealRecord, "type">>>>>;
  recurringMeals: Partial<Record<MealType, Omit<MealRecord, "type">>>;
  notices: string[];
  warning?: string;
}

export function scheduledSnapshotFixture(): {
  schemaVersion: number;
  collectedAt: string;
  colleges: Record<string, SnapshotRecordFixture>;
} {
  const colleges: Record<string, SnapshotRecordFixture> = Object.fromEntries(
    COLLEGES.filter(({ retrieval }) => retrieval === "scheduled").map(({ id }) => [id, {
      college: id,
      coverage: "link-only",
      collectedAt: "2026-08-12T06:00:00.000Z",
      sourceModifiedAt: null,
      validFrom: null,
      validThrough: null,
      mealsByDate: {},
      recurringMeals: {},
      notices: []
    } satisfies SnapshotRecordFixture])
  );
  return { schemaVersion: 2, collectedAt: "2026-08-12T06:00:00.000Z", colleges };
}
