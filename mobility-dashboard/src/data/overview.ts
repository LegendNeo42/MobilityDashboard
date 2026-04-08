import { getTransportModeDefinition } from "./domain";
import { loadSurveyMetadata } from "./surveyMetadata";
import type { SurveyStatusGroupSummary } from "./surveyMetadata";
import { loadVehicleUsageByGroupData } from "./vehicle";

export type DashboardOverviewSummary = {
  validResponses: number;
  participationGroups: SurveyStatusGroupSummary[];
  otherGroupResponses: number;
  mainGroupCoverageShare: number;
  referenceSemesterTime: string;
  topVehicleUsage: {
    label: string;
    people: number;
  };
  secondVehicleUsage: {
    label: string;
    people: number;
  } | null;
};

let dashboardOverviewSummaryCache: Promise<DashboardOverviewSummary> | null = null;

export async function loadDashboardOverviewSummary(): Promise<DashboardOverviewSummary> {
  if (dashboardOverviewSummaryCache) return dashboardOverviewSummaryCache;

  dashboardOverviewSummaryCache = Promise.all([
    loadSurveyMetadata(),
    loadVehicleUsageByGroupData(),
  ]).then(([metadata, vehicleUsageDataset]) => {
    const referenceSemesterTime = vehicleUsageDataset.semesterOptions[0];
    if (!referenceSemesterTime) {
      throw new Error("No vehicle usage data available for the overview.");
    }

    const vehicleTotals = new Map<
      string,
      { label: string; order: number; people: number }
    >();

    for (const row of vehicleUsageDataset.rows) {
      if (row.semester_time !== referenceSemesterTime) continue;

      const transport = getTransportModeDefinition(row.vehicle);
      const current = vehicleTotals.get(row.vehicle);

      if (current) {
        current.people += row.people;
        continue;
      }

      vehicleTotals.set(row.vehicle, {
        label: transport.label,
        order: transport.order,
        people: row.people,
      });
    }

    const rankedVehicles = Array.from(vehicleTotals.values()).sort((a, b) => {
      if (b.people !== a.people) return b.people - a.people;
      return a.order - b.order;
    });

    const [topVehicleUsage, secondVehicleUsage] = rankedVehicles;

    return {
      validResponses: metadata.validResponses,
      participationGroups: metadata.statusGroupSummaries,
      otherGroupResponses: metadata.otherGroupResponses,
      mainGroupCoverageShare:
        metadata.validResponses > 0
          ? (metadata.mainGroupResponses / metadata.validResponses) * 100
          : 0,
      referenceSemesterTime,
      topVehicleUsage: {
        label: topVehicleUsage?.label ?? "Keine Angabe",
        people: topVehicleUsage?.people ?? 0,
      },
      secondVehicleUsage: secondVehicleUsage
        ? {
            label: secondVehicleUsage.label,
            people: secondVehicleUsage.people,
          }
        : null,
    };
  });

  return dashboardOverviewSummaryCache;
}