export type QualitativeThemeKey =
  | "public_transport_reliability_frequency_directness"
  | "crowding"
  | "ticketing_price"
  | "bicycle_safety"
  | "bicycle_infrastructure_parking"
  | "winter_conditions"
  | "parking_car_context"
  | "direct_connections_university_locations"
  | "accessibility_campus_access"
  | "other_mobility_context";

export type QualitativeStatusGroupKey = "student" | "employee" | "prof";

export type QualitativeEmploymentStatusSummary = {
  key: string;
  label: string;
  statements: number;
  participants: number;
};

export type QualitativeThemeStatusGroupSummary = {
  key: QualitativeStatusGroupKey;
  label: string;
  statements: number;
  participants: number;
};

export type QualitativeThemeSourceFieldSummary = {
  key: string;
  label: string;
  statements: number;
};

export type QualitativeThemeQuote = {
  text: string;
  sourceField: string;
  sourceFieldLabel: string;
  statusGroup: QualitativeStatusGroupKey | null;
  statusGroupLabel: string | null;
};

export type QualitativeThemeSummary = {
  key: QualitativeThemeKey;
  label: string;
  order: number;
  statements: number;
  participants: number;
  shareOfDashboardSelectableStatements: number;
  statusGroups: QualitativeThemeStatusGroupSummary[];
  excludedStatusStatements: number;
  excludedStatusParticipants: number;
  excludedEmploymentStatuses: QualitativeEmploymentStatusSummary[];
  sourceFields: QualitativeThemeSourceFieldSummary[];
  quotes: QualitativeThemeQuote[];
};

export type QualitativeIncludedSourceFieldSummary = {
  key: string;
  label: string;
  order: number;
  statements: number;
};

export type QualitativePreparedDataset = {
  generatedAt: string;
  sourceFile: string;
  includedSourceFields: QualitativeIncludedSourceFieldSummary[];
  totals: {
    rawParticipants: number;
    preparedStatements: number;
    excludedStatements: number;
    participantsWithPreparedStatements: number;
    dashboardSelectableStatements: number;
    dashboardSelectableParticipants: number;
    dashboardSelectableStatusGroups: Array<{
      key: QualitativeStatusGroupKey;
      label: string;
      participants: number;
    }>;
    excludedStatusStatements: number;
    excludedStatusParticipants: number;
    excludedEmploymentStatuses: QualitativeEmploymentStatusSummary[];
  };
  themes: QualitativeThemeSummary[];
};

const qualitativeThemeSummaryPath =
  "/data/qualitative-data/qualitative_theme_summary.json";

let qualitativePreparedDatasetCache: Promise<QualitativePreparedDataset> | null =
  null;

export async function loadQualitativePreparedDataset(): Promise<QualitativePreparedDataset> {
  if (qualitativePreparedDatasetCache) {
    return qualitativePreparedDatasetCache;
  }

  qualitativePreparedDatasetCache = fetch(qualitativeThemeSummaryPath).then(
    async (response) => {
      if (!response.ok) {
        throw new Error(
          `Qualitative dataset load failed: HTTP ${response.status}`,
        );
      }

      return (await response.json()) as QualitativePreparedDataset;
    },
  );

  return qualitativePreparedDatasetCache;
}