import { loadCsvRows } from "./csv";
import {
  getImportanceResponseDefinitionByKey,
  getImportanceResponseDefinitionByRawValue,
  getPublicTransportImprovementDefinition,
  getStatusGroupByKey,
  getStatusGroupBySourceStatus,
} from "./domain";
import type {
  ImportanceResponseKey,
  StatusGroupKey,
  SurveyResponseSpecialKey,
} from "./domain";

export type PublicTransportImprovementResponseKey =
  | ImportanceResponseKey
  | SurveyResponseSpecialKey;

export type PublicTransportImprovementRow = {
  topic: string;
  topic_label: string;
  topic_order: number;
  response_key: PublicTransportImprovementResponseKey;
  response_label: string;
  response_order: number;
  response_family: "likert" | "special";
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  people: number;
};

export type PublicTransportImprovementValidSummary = {
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  participants: number;
};

export type PublicTransportImprovementDataset = {
  rows: PublicTransportImprovementRow[];
  validSummaries: PublicTransportImprovementValidSummary[];
};

const specialResponseLabels: Record<SurveyResponseSpecialKey, string> = {
  no_opinion: "Keine Meinung",
  no_answer: "Keine Angabe",
};

const specialResponseOrder: Record<SurveyResponseSpecialKey, number> = {
  no_opinion: 6,
  no_answer: 7,
};

let publicTransportImprovementCache: PublicTransportImprovementDataset | null =
  null;

function buildPublicTransportImprovementDataset(
  rows: Array<Record<string, string>>,
): PublicTransportImprovementDataset {
  const responseSets = new Map<string, Set<string>>();
  const validParticipantSets = new Map<string, Set<string>>();

  for (const row of rows) {
    const participantId = row.participant_id?.trim();
    const statusGroup = getStatusGroupBySourceStatus(row.status?.trim() ?? "");
    const topic = getPublicTransportImprovementDefinition(row.topic?.trim() ?? "");
    const rawResponse = row.response?.trim() ?? "";

    if (!participantId || !statusGroup || !topic) continue;

    const group = getStatusGroupByKey(statusGroup.key);
    if (!group) continue;

    const importanceResponse = getImportanceResponseDefinitionByRawValue(rawResponse);
    const isSpecialResponse =
      rawResponse === "no_opinion" || rawResponse === "no_answer";

    if (!importanceResponse && !isSpecialResponse) continue;

    const responseKey =
      importanceResponse?.key ?? (rawResponse as SurveyResponseSpecialKey);
    const responseSetKey = [group.key, topic.key, responseKey].join("|");

    let responseParticipants = responseSets.get(responseSetKey);
    if (!responseParticipants) {
      responseParticipants = new Set<string>();
      responseSets.set(responseSetKey, responseParticipants);
    }
    responseParticipants.add(participantId);

    if (importanceResponse) {
      let validParticipants = validParticipantSets.get(group.key);
      if (!validParticipants) {
        validParticipants = new Set<string>();
        validParticipantSets.set(group.key, validParticipants);
      }
      validParticipants.add(participantId);
    }
  }

  const improvementRows: PublicTransportImprovementRow[] = [];
  for (const [key, participants] of responseSets.entries()) {
    const [groupKey, topicKey, responseKey] = key.split("|");
    const group = getStatusGroupByKey(groupKey);
    const topic = getPublicTransportImprovementDefinition(topicKey);
    const importanceResponse = getImportanceResponseDefinitionByKey(responseKey);
    const isSpecialResponse =
      responseKey === "no_opinion" || responseKey === "no_answer";

    if (!group || !topic || (!importanceResponse && !isSpecialResponse)) continue;

    improvementRows.push({
      topic: topic.key,
      topic_label: topic.label,
      topic_order: topic.order,
      response_key: responseKey as PublicTransportImprovementResponseKey,
      response_label:
        importanceResponse?.label ??
        specialResponseLabels[responseKey as SurveyResponseSpecialKey],
      response_order:
        importanceResponse?.order ??
        specialResponseOrder[responseKey as SurveyResponseSpecialKey],
      response_family: importanceResponse ? "likert" : "special",
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      people: participants.size,
    });
  }

  const validSummaries: PublicTransportImprovementValidSummary[] = [];
  for (const [groupKey, participants] of validParticipantSets.entries()) {
    const group = getStatusGroupByKey(groupKey);
    if (!group) continue;

    validSummaries.push({
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      participants: participants.size,
    });
  }

  return {
    rows: improvementRows.sort((a, b) => {
      if (a.topic_order !== b.topic_order) return a.topic_order - b.topic_order;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      return a.response_order - b.response_order;
    }),
    validSummaries: validSummaries.sort((a, b) => a.group_order - b.group_order),
  };
}

export async function loadPublicTransportImprovementData(): Promise<PublicTransportImprovementDataset> {
  if (publicTransportImprovementCache) return publicTransportImprovementCache;

  const rows = await loadCsvRows("/data/data_poll_opnv_feedback.csv");
  publicTransportImprovementCache = buildPublicTransportImprovementDataset(rows);

  return publicTransportImprovementCache;
}