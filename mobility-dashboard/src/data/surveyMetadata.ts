import { loadCsvRows } from "./csv";
import { statusGroupDefinitions } from "./domain";
import type { StatusGroupKey } from "./domain";
import { sortSemesterTimes } from "../utils/semester";

export type SurveyParticipationRateBreakdown = {
  label: string;
  participationRatePercent: number;
};

export type SurveyStatusGroupSummary = {
  key: StatusGroupKey;
  label: string;
  participants: number;
  shareOfValidResponses: number;
  participationRatePercent: number | null;
  participationRateBreakdown: SurveyParticipationRateBreakdown[];
};

export type SurveyMetadata = {
  surveyLabel: string;
  surveyPeriodLabel: string;
  validResponses: number;
  universityParticipationRatePercent: number;
  approxFreeTextResponses: number;
  semesterTimes: string[];
  otherGroupResponses: number;
  statusGroupSummaries: SurveyStatusGroupSummary[];
  mainGroupResponses: number;
};

const SURVEY_LABEL = "Mobilitätsumfrage der Universität Regensburg";
const SURVEY_PERIOD_LABEL = "Wintersemester 2024/25";
const APPROX_FREE_TEXT_RESPONSES = 4500;
const UNIVERSITY_PARTICIPATION_RATE_PERCENT = 12;

const participationRateReferences: Record<
  StatusGroupKey,
  {
    participationRatePercent: number | null;
    participationRateBreakdown?: SurveyParticipationRateBreakdown[];
  }
> = {
  student: {
    participationRatePercent: 8,
  },
  employee: {
    participationRatePercent: null,
    participationRateBreakdown: [
      {
        label: "Wissenschaftsstützende Mitarbeitende",
        participationRatePercent: 35,
      },
      {
        label: "Wissenschaftliche Mitarbeitende",
        participationRatePercent: 25,
      },
    ],
  },
  prof: {
    participationRatePercent: 39,
  },
};

let surveyMetadataCache: Promise<SurveyMetadata> | null = null;

function collectUniqueParticipantIds(
  rows: Array<Record<string, string>>,
  fieldName = "participant_id",
): Set<string> {
  const participantIds = new Set<string>();

  for (const row of rows) {
    const participantId = row[fieldName]?.trim();
    if (!participantId) continue;
    participantIds.add(participantId);
  }

  return participantIds;
}

function countUniqueParticipantsByStatus(
  rows: Array<Record<string, string>>,
  sourceStatus: string,
): number {
  const participantIds = new Set<string>();

  for (const row of rows) {
    if (row.employment_status?.trim() !== sourceStatus) continue;

    const participantId = row.participant_id?.trim();
    if (!participantId) continue;

    participantIds.add(participantId);
  }

  return participantIds.size;
}

function buildStatusGroupSummaries(
  rows: Array<Record<string, string>>,
  validResponses: number,
): SurveyStatusGroupSummary[] {
  const participantIdsByGroup = new Map<StatusGroupKey, Set<string>>();

  for (const definition of statusGroupDefinitions) {
    participantIdsByGroup.set(definition.key, new Set<string>());
  }

  for (const row of rows) {
    const participantId = row.participant_id?.trim();
    const sourceStatus = row.employment_status?.trim();

    if (!participantId || !sourceStatus) continue;

    const group = statusGroupDefinitions.find((definition) =>
      definition.sourceStatuses.includes(sourceStatus),
    );

    if (!group) continue;

    participantIdsByGroup.get(group.key)?.add(participantId);
  }

  return statusGroupDefinitions.map((definition) => {
    const participants = participantIdsByGroup.get(definition.key)?.size ?? 0;
    const participationRateReference = participationRateReferences[definition.key];

    return {
      key: definition.key,
      label: definition.label,
      participants,
      shareOfValidResponses:
        validResponses > 0 ? (participants / validResponses) * 100 : 0,
      participationRatePercent:
        participationRateReference.participationRatePercent,
      participationRateBreakdown:
        participationRateReference.participationRateBreakdown ?? [],
    };
  });
}

export async function loadSurveyMetadata(): Promise<SurveyMetadata> {
  if (surveyMetadataCache) return surveyMetadataCache;

  surveyMetadataCache = loadCsvRows("/data/data_days_present.csv").then(
    (dayPresentRows) => {
      const validResponseIds = collectUniqueParticipantIds(dayPresentRows);
      const validResponses = validResponseIds.size;
      const statusGroupSummaries = buildStatusGroupSummaries(
        dayPresentRows,
        validResponses,
      );

      const semesterTimes = sortSemesterTimes(
        Array.from(
          new Set(
            dayPresentRows
              .map((row) => row.semester_time?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ),
      );

      return {
        surveyLabel: SURVEY_LABEL,
        surveyPeriodLabel: SURVEY_PERIOD_LABEL,
        validResponses,
        universityParticipationRatePercent: UNIVERSITY_PARTICIPATION_RATE_PERCENT,
        approxFreeTextResponses: APPROX_FREE_TEXT_RESPONSES,
        semesterTimes,
        otherGroupResponses: countUniqueParticipantsByStatus(
          dayPresentRows,
          "other",
        ),
        statusGroupSummaries,
        mainGroupResponses: statusGroupSummaries.reduce(
          (total, group) => total + group.participants,
          0,
        ),
      };
    },
  );

  return surveyMetadataCache;
}