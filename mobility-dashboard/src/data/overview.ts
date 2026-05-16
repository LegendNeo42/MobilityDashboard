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
  surveyLabel: string;
  surveyPeriodLabel: string;
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
      ? `${topVehicleUsage?.label ?? "Dieses Verkehrsmittel"} ist am häufigsten genannt; ${secondVehicleUsage.label} folgt mit ${formatInteger(secondVehicleUsage.people)} Nennungen.`
      : "Häufigstes genanntes Verkehrsmittel in der Übersicht.",
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
    if (row.main_vehicle !== "car-driver" || row.response_key !== "yes") {
      continue;
    }

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
    text: "der Autofahrenden nennen diese Barriere gegen Bus und Bahn.",
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
    text: `${formatInteger(topTheme.statements)} Aussagen machen dieses Thema zum wichtigsten.`,
  };
}

function buildRegionalConcentrationHighlight(
  _plzMapDataset: Awaited<ReturnType<typeof loadPlzMapDataset>>,
): DashboardOverviewHighlight {
  return {
    eyebrow: "Karte",
    title: "regionale Konzentration",
    value: "61 %",
    text: "der berücksichtigten Teilnehmenden kommen aus Regensburg.",
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
        "der Bewertungen stufen dieses Thema als eher oder sehr wichtig ein.",
      );
      if (bicycleHighlight) highlights.push(bicycleHighlight);

      const publicTransportImprovementHighlight = buildTopImportanceHighlight(
        publicTransportImprovementDataset,
        "ÖPNV-Verbesserung",
        "der Bewertungen stufen dieses Thema als eher oder sehr wichtig ein.",
      );
      if (publicTransportImprovementHighlight) {
        highlights.push(publicTransportImprovementHighlight);
      }

      const qualitativeHighlight =
        buildTopQualitativeThemeHighlight(qualitativeDataset);
      if (qualitativeHighlight) highlights.push(qualitativeHighlight);

      return {
        surveyLabel: metadata.surveyLabel,
        surveyPeriodLabel: metadata.surveyPeriodLabel,
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