import { loadCsvRows } from "./csv";
import { getBicycleImprovementDefinition } from "./domain";
import { buildImportancePriorityDataset } from "./importancePriorities";
import type {
  ImportancePriorityDataset,
  ImportancePriorityResponseKey,
  ImportancePriorityRow,
  ImportancePriorityValidSummary,
} from "./importancePriorities";

export type BicycleImprovementResponseKey = ImportancePriorityResponseKey;

export type BicycleImprovementRow = ImportancePriorityRow;

export type BicycleImprovementValidSummary = ImportancePriorityValidSummary;

export type BicycleImprovementDataset = ImportancePriorityDataset;

let bicycleImprovementCache: BicycleImprovementDataset | null = null;

export async function loadBicycleImprovementData(): Promise<BicycleImprovementDataset> {
  if (bicycleImprovementCache) return bicycleImprovementCache;

  const rows = await loadCsvRows("/data/data_poll_bicycle_feedback.csv");
  bicycleImprovementCache = buildImportancePriorityDataset(
    rows,
    getBicycleImprovementDefinition,
  );

  return bicycleImprovementCache;
}