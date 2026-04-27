import { getTransportModeDefinition } from "./domain";
import { loadBicycleImprovementData } from "./bicycleImprovements";
import { loadPublicTransportBarrierData } from "./publicTransportBarriers";
import { loadPublicTransportImprovementData } from "./publicTransportImprovements";
import { loadQualitativePreparedDataset } from "./qualitativeFeedback";
import { loadPlzMapDataset } from "./plzMap";
import { loadSurveyMetadata } from "./surveyMetadata";
import type { SurveyStatusGroupSummary } from "./surveyMetadata";
import type { ImportancePriorityDataset } from "./importancePriorities";
import { loadVehicleUsageByGroupData } from "./vehicle";

export type DashboardOverviewHighlight = {
  eyebrow: string;
  title: string;
  value: string;
  text: string;
};

export type DashboardOverviewSummary = {
  validResponses: number;
  universityParticipationRatePercent: number;
  participationGroups: SurveyStatusGroupSummary[];
  otherGroupResponses: number;
  mainGroupCoverageShare: number;
  highlights: DashboardOverviewHighlight[];
};

let dashboardOverviewSummaryCache: Promise<DashboardOverviewSummary> | null =
  null;

function formatInteger(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildTopVehicleHighlight(
  vehicleUsageDataset: Awaited<ReturnType<typeof loadVehicleUsageByGroupData>>,
): DashboardOverviewHighlight {
  const referenceSemesterTime = vehicleUsageDataset.semesterOptions[0];
  if (!referenceSemesterTime) {
    return {
      eyebrow: "Verkehrsmittel",
      title: "Keine Daten verfügbar",
      value: "–",
      text: "Für die Verkehrsmittelübersicht konnten keine Daten geladen werden.",
    };
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
    eyebrow: "Verkehrsmittel",
    title: topVehicleUsage?.label ?? "Keine Angabe",
    value: formatInteger(topVehicleUsage?.people ?? 0),
    text: secondVehicleUsage
      ? `Personen nennen dieses Verkehrsmittel im Wintersemester (vorlesungszeit); ${secondVehicleUsage.label} folgt mit ${formatInteger(secondVehicleUsage.people)} Personen.`
      : "Personen nennen dieses Verkehrsmittel in der Übersicht.",
  };
}

function buildTopPublicTransportBarrierHighlight(
  barrierDataset: Awaited<ReturnType<typeof loadPublicTransportBarrierData>>,
): DashboardOverviewHighlight | null {
  const carDriverSegmentSize = barrierDataset.segmentSummaries
    .filter((summary) => summary.main_vehicle === "car-driver")
    .reduce((total, summary) => total + summary.participants, 0);

  if (carDriverSegmentSize <= 0) return null;

  const yesCountsByBarrier = new Map<
    string,
    { label: string; order: number; people: number }
  >();

  for (const row of barrierDataset.rows) {
    if (row.main_vehicle !== "car-driver" || row.response_key !== "yes")
      continue;

    const current = yesCountsByBarrier.get(row.barrier);
    if (current) {
      current.people += row.people;
      continue;
    }

    yesCountsByBarrier.set(row.barrier, {
      label: row.barrier_label,
      order: row.barrier_order,
      people: row.people,
    });
  }

  const topBarrier = Array.from(yesCountsByBarrier.values()).sort((a, b) => {
    if (b.people !== a.people) return b.people - a.people;
    return a.order - b.order;
  })[0];

  if (!topBarrier) return null;

  return {
    eyebrow: "ÖPNV-Barriere",
    title: topBarrier.label,
    value: `${formatPercent((topBarrier.people / carDriverSegmentSize) * 100)} %`,
    text: "der befragten Autofahrenden nennen diesen Punkt als Grund gegen die ÖPNV-Nutzung.",
  };
}

function buildTopImportanceHighlight(
  dataset: ImportancePriorityDataset,
  eyebrow: string,
  text: string,
): DashboardOverviewHighlight | null {
  const importanceByTopic = new Map<
    string,
    {
      label: string;
      order: number;
      positivePeople: number;
      validPeople: number;
    }
  >();

  for (const row of dataset.rows) {
    if (row.response_family !== "likert") continue;

    const current = importanceByTopic.get(row.topic) ?? {
      label: row.topic_label,
      order: row.topic_order,
      positivePeople: 0,
      validPeople: 0,
    };

    current.validPeople += row.people;

    if (
      row.response_key === "rather_important" ||
      row.response_key === "very_important"
    ) {
      current.positivePeople += row.people;
    }

    importanceByTopic.set(row.topic, current);
  }

  const topTopic = Array.from(importanceByTopic.values())
    .filter((topic) => topic.validPeople > 0)
    .sort((a, b) => {
      const shareDifference =
        b.positivePeople / b.validPeople - a.positivePeople / a.validPeople;
      if (shareDifference !== 0) return shareDifference;

      if (b.positivePeople !== a.positivePeople) {
        return b.positivePeople - a.positivePeople;
      }

      return a.order - b.order;
    })[0];

  if (!topTopic) return null;

  return {
    eyebrow,
    title: topTopic.label,
    value: `${formatPercent((topTopic.positivePeople / topTopic.validPeople) * 100)} %`,
    text,
  };
}

function buildTopQualitativeThemeHighlight(
  qualitativeDataset: Awaited<
    ReturnType<typeof loadQualitativePreparedDataset>
  >,
): DashboardOverviewHighlight | null {
  const topTheme = qualitativeDataset.themes
    .filter((theme) => theme.statements > 0)
    .sort((a, b) => {
      if (b.statements !== a.statements) return b.statements - a.statements;
      return a.order - b.order;
    })[0];

  if (!topTheme) return null;

  return {
    eyebrow: "Freitext-Thema",
    title: topTheme.label,
    value: formatInteger(topTheme.statements),
    text: "vorbereitete Aussagen entfallen im qualitativen Überblick auf dieses Thema.",
  };
}

function buildRegionalConcentrationHighlight(
  plzMapDataset: Awaited<ReturnType<typeof loadPlzMapDataset>>,
): DashboardOverviewHighlight | null {
  const referenceSemesterTime = plzMapDataset.semesterOptions.includes("ws_vl")
    ? "ws_vl"
    : plzMapDataset.semesterOptions[0];

  if (!referenceSemesterTime) return null;

  const visibleRows = Array.from(plzMapDataset.rowsByKey.values()).filter(
    (row) => row.semester_time === referenceSemesterTime && row.n > 0,
  );

  const visibleCases = visibleRows.reduce((total, row) => total + row.n, 0);
  if (visibleCases <= 0) return null;

  const topRegionCases = visibleRows
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .reduce((total, row) => total + row.n, 0);

  return {
    eyebrow: "PLZ-Karte",
    title: "Regionale Konzentration",
    value: ` ${formatPercent((topRegionCases / visibleCases) * 100)} %`,
    text: "der sichtbaren Kartenfälle liegen in den fünf stärksten PLZ-Bereichen.",
  };
}

export async function loadDashboardOverviewSummary(): Promise<DashboardOverviewSummary> {
  if (dashboardOverviewSummaryCache) return dashboardOverviewSummaryCache;

  dashboardOverviewSummaryCache = Promise.all([
    loadSurveyMetadata(),
    loadVehicleUsageByGroupData(),
    loadPublicTransportBarrierData(),
    loadBicycleImprovementData(),
    loadPublicTransportImprovementData(),
    loadQualitativePreparedDataset(),
    loadPlzMapDataset(),
  ]).then(
    ([
      metadata,
      vehicleUsageDataset,
      barrierDataset,
      bicycleDataset,
      publicTransportImprovementDataset,
      qualitativeDataset,
      plzMapDataset,
    ]) => {
      const highlights: DashboardOverviewHighlight[] = [];
      highlights.push(buildTopVehicleHighlight(vehicleUsageDataset));
      const regionalHighlight =
        buildRegionalConcentrationHighlight(plzMapDataset);
      if (regionalHighlight) highlights.push(regionalHighlight);

      const barrierHighlight =
        buildTopPublicTransportBarrierHighlight(barrierDataset);
      if (barrierHighlight) highlights.push(barrierHighlight);

      const bicycleHighlight = buildTopImportanceHighlight(
        bicycleDataset,
        "Fahrrad",
        "der gültigen Bewertungen zu diesem Thema sind eher oder sehr wichtig.",
      );
      if (bicycleHighlight) highlights.push(bicycleHighlight);

      const publicTransportImprovementHighlight = buildTopImportanceHighlight(
        publicTransportImprovementDataset,
        "ÖPNV-Verbesserung",
        "der gültigen Bewertungen zu diesem Thema sind eher oder sehr wichtig.",
      );
      if (publicTransportImprovementHighlight) {
        highlights.push(publicTransportImprovementHighlight);
      }

      const qualitativeHighlight =
        buildTopQualitativeThemeHighlight(qualitativeDataset);
      if (qualitativeHighlight) highlights.push(qualitativeHighlight);

      return {
        validResponses: metadata.validResponses,
        universityParticipationRatePercent:
          metadata.universityParticipationRatePercent,
        participationGroups: metadata.statusGroupSummaries,
        otherGroupResponses: metadata.otherGroupResponses,
        mainGroupCoverageShare:
          metadata.validResponses > 0
            ? (metadata.mainGroupResponses / metadata.validResponses) * 100
            : 0,
        highlights,
      };
    },
  );

  return dashboardOverviewSummaryCache;
}
