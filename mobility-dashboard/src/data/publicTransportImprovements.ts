import { loadCsvRows } from "./csv";
import { buildImportancePriorityDataset } from "./importancePriorities";
import { getPublicTransportImprovementDefinition } from "./domain";
import type {
  ImportancePriorityDataset,
  ImportancePriorityResponseKey,
  ImportancePriorityRow,
  ImportancePriorityValidSummary,
} from "./importancePriorities";

export type PublicTransportImprovementResponseKey =
  ImportancePriorityResponseKey;

export type PublicTransportImprovementRow = ImportancePriorityRow;

export type PublicTransportImprovementValidSummary =
  ImportancePriorityValidSummary;

export type PublicTransportImprovementDataset = ImportancePriorityDataset;

let publicTransportImprovementCache: PublicTransportImprovementDataset | null =
  null;

export async function loadPublicTransportImprovementData(): Promise<PublicTransportImprovementDataset> {
  if (publicTransportImprovementCache) return publicTransportImprovementCache;

  const rows = await loadCsvRows("/data/data_poll_opnv_feedback.csv");
  publicTransportImprovementCache = buildImportancePriorityDataset(
    rows,
    getPublicTransportImprovementDefinition,
  );

  return publicTransportImprovementCache;
}