import {
  getImportanceResponseDefinitionByKey,
  getImportanceResponseDefinitionByRawValue,
  getStatusGroupByKey,
  getStatusGroupBySourceStatus,
} from "./domain";
import type {
  ImportanceResponseKey,
  StatusGroupKey,
  SurveyResponseSpecialKey,
} from "./domain";

export type ImportancePriorityResponseKey =
  | ImportanceResponseKey
  | SurveyResponseSpecialKey;

export type ImportancePriorityTopicDefinition = {
  key: string;
  label: string;
  order: number;
};

export type ImportancePriorityRow = {
  topic: string;
  topic_label: string;
  topic_order: number;
  response_key: ImportancePriorityResponseKey;
  response_label: string;
  response_order: number;
  response_family: "likert" | "special";
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  people: number;
};

export type ImportancePriorityValidSummary = {
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  participants: number;
};

export type ImportancePriorityDataset = {
  rows: ImportancePriorityRow[];
  validSummaries: ImportancePriorityValidSummary[];
};

const specialResponseLabels: Record<SurveyResponseSpecialKey, string> = {
  no_opinion: "Keine Meinung",
  no_answer: "Keine Angabe",
};

const specialResponseOrder: Record<SurveyResponseSpecialKey, number> = {
  no_opinion: 6,
  no_answer: 7,
};

export function buildImportancePriorityDataset(
  rows: Array<Record<string, string>>,
  getTopicDefinition: (value: string) => ImportancePriorityTopicDefinition | null,
): ImportancePriorityDataset {
  const responseSets = new Map<string, Set<string>>();
  const validParticipantSets = new Map<string, Set<string>>();

  for (const row of rows) {
    const participantId = row.participant_id?.trim();
    const statusGroup = getStatusGroupBySourceStatus(row.status?.trim() ?? "");
    const topic = getTopicDefinition(row.topic?.trim() ?? "");
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

  const priorityRows: ImportancePriorityRow[] = [];
  for (const [key, participants] of responseSets.entries()) {
    const [groupKey, topicKey, responseKey] = key.split("|");
    const group = getStatusGroupByKey(groupKey);
    const topic = getTopicDefinition(topicKey);
    const importanceResponse = getImportanceResponseDefinitionByKey(responseKey);
    const isSpecialResponse =
      responseKey === "no_opinion" || responseKey === "no_answer";

    if (!group || !topic || (!importanceResponse && !isSpecialResponse)) continue;

    priorityRows.push({
      topic: topic.key,
      topic_label: topic.label,
      topic_order: topic.order,
      response_key: responseKey as ImportancePriorityResponseKey,
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

  const validSummaries: ImportancePriorityValidSummary[] = [];
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
    rows: priorityRows.sort((a, b) => {
      if (a.topic_order !== b.topic_order) return a.topic_order - b.topic_order;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      return a.response_order - b.response_order;
    }),
    validSummaries: validSummaries.sort((a, b) => a.group_order - b.group_order),
  };
}