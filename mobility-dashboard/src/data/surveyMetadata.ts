import { loadCsvRows } from "./csv";
import { sortSemesterTimes } from "../utils/semester";

export type SurveyMetadata = {
  surveyLabel: string;
  surveyPeriodLabel: string;
  validResponses: number;
  approxFreeTextResponses: number;
  semesterTimes: string[];
  otherGroupResponses: number;
};

const SURVEY_LABEL = "Mobilitätsumfrage der Universität Regensburg";
const SURVEY_PERIOD_LABEL = "Wintersemester 2024/25";
const APPROX_FREE_TEXT_RESPONSES = 4500;

let surveyMetadataCache: Promise<SurveyMetadata> | null = null;

function countUniqueParticipantIds(
  rows: Array<Record<string, string>>,
  fieldName = "participant_id",
): number {
  const participantIds = new Set<string>();

  for (const row of rows) {
    const participantId = row[fieldName]?.trim();
    if (!participantId) continue;
    participantIds.add(participantId);
  }

  return participantIds.size;
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

export async function loadSurveyMetadata(): Promise<SurveyMetadata> {
  if (surveyMetadataCache) return surveyMetadataCache;

  surveyMetadataCache = loadCsvRows("/data/data_days_present.csv").then(
    (dayPresentRows) => {
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
        validResponses: countUniqueParticipantIds(dayPresentRows),
        approxFreeTextResponses: APPROX_FREE_TEXT_RESPONSES,
        semesterTimes,
        otherGroupResponses: countUniqueParticipantsByStatus(
          dayPresentRows,
          "other",
        ),
      };
    },
  );

  return surveyMetadataCache;
}