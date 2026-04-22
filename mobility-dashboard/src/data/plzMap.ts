import { statusGroupDefinitions, transportModeDefinitions } from "./domain";
import type { StatusGroupKey } from "./domain";
import { sortSemesterTimes } from "../utils/semester";

type TransportCountMap = Record<string, number>;
type TransportShareMap = Record<string, number>;

type RawStatusGroupMetric = {
  n: number;
  main_transport_counts: TransportCountMap;
  main_transport_shares: TransportShareMap;
};

type RawPlzMetricRow = {
  plz: string;
  semester_time: string;
  centroid: {
    longitude: number;
    latitude: number;
  };
  distance_to_focus_center_km: number;
  n: number;
  status_group_counts: Record<StatusGroupKey, number>;
  main_transport_counts: TransportCountMap;
  main_transport_shares: TransportShareMap;
  status_group_metrics: Record<StatusGroupKey, RawStatusGroupMetric>;
};

type RawPlzMetricsFile = {
  focus: {
    radius_km: number;
    included_case_count: number;
    excluded_case_count: number;
    included_plz_count: number;
    excluded_plz_count: number;
    unmatched_case_count: number;
    unmatched_plz_count: number;
  };
  semester_times: string[];
  rows: RawPlzMetricRow[];
};

type PolygonCoordinates = number[][][];
type MultiPolygonCoordinates = number[][][][];

type PlzGeometry =
  | {
      type: "Polygon";
      coordinates: PolygonCoordinates;
    }
  | {
      type: "MultiPolygon";
      coordinates: MultiPolygonCoordinates;
    };

export type PlzMapFeature = {
  type: "Feature";
  properties: {
    plz: string;
    centroid: {
      longitude: number;
      latitude: number;
    };
    geometry_source_rows: number;
    geometry_parts: number;
    distance_to_focus_center_km: number;
  };
  geometry: PlzGeometry;
};

type RawPlzRegionsFile = {
  type: "FeatureCollection";
  features: PlzMapFeature[];
};

export type PlzMapDataset = {
  features: PlzMapFeature[];
  semesterOptions: string[];
  maxParticipantCount: number;
  focus: {
    radiusKm: number;
    includedCaseCount: number;
    excludedCaseCount: number;
    includedPlzCount: number;
    excludedPlzCount: number;
    unmatchedCaseCount: number;
    unmatchedPlzCount: number;
  };
  rowsByKey: Map<string, RawPlzMetricRow>;
};

export type PlzRegionMetric = {
  plz: string;
  centroid: {
    longitude: number;
    latitude: number;
  };
  distanceToFocusCenterKm: number;
  n: number;
  transportCounts: TransportCountMap;
  transportShares: TransportShareMap;
};

const REGIONS_PATH = "/data/plz-map/plz_focus_regions.geojson";
const METRICS_PATH = "/data/plz-map/plz_focus_metrics.json";

const allStatusGroupKeys = statusGroupDefinitions.map((definition) => definition.key);

let plzMapDatasetCache: Promise<PlzMapDataset> | null = null;

function buildEmptyTransportCountMap(): TransportCountMap {
  return Object.fromEntries(
    transportModeDefinitions.map((definition) => [definition.key, 0]),
  );
}

function buildEmptyTransportShareMap(): TransportShareMap {
  return Object.fromEntries(
    transportModeDefinitions.map((definition) => [definition.key, 0]),
  );
}

function buildMetricKey(plz: string, semesterTime: string): string {
  return `${semesterTime}|${plz}`;
}

function buildAggregatedRegionMetric(
  row: RawPlzMetricRow | undefined,
  statusGroups: StatusGroupKey[],
): Pick<PlzRegionMetric, "n" | "transportCounts" | "transportShares"> {
  if (!row) {
    return {
      n: 0,
      transportCounts: buildEmptyTransportCountMap(),
      transportShares: buildEmptyTransportShareMap(),
    };
  }

  const activeStatusGroups =
    statusGroups.length > 0 ? statusGroups : [...allStatusGroupKeys];

  if (activeStatusGroups.length === allStatusGroupKeys.length) {
    return {
      n: row.n,
      transportCounts: { ...row.main_transport_counts },
      transportShares: { ...row.main_transport_shares },
    };
  }

  const transportCounts = buildEmptyTransportCountMap();
  let n = 0;

  for (const statusGroup of activeStatusGroups) {
    const groupMetrics = row.status_group_metrics[statusGroup];
    if (!groupMetrics) continue;

    n += groupMetrics.n;

    for (const definition of transportModeDefinitions) {
      transportCounts[definition.key] +=
        groupMetrics.main_transport_counts[definition.key] ?? 0;
    }
  }

  const transportShares = buildEmptyTransportShareMap();
  if (n > 0) {
    for (const definition of transportModeDefinitions) {
      transportShares[definition.key] = transportCounts[definition.key] / n;
    }
  }

  return { n, transportCounts, transportShares };
}

export async function loadPlzMapDataset(): Promise<PlzMapDataset> {
  if (!plzMapDatasetCache) {
    plzMapDatasetCache = Promise.all([
      fetch(REGIONS_PATH).then(async (response) => {
        if (!response.ok) {
          throw new Error(`PLZ regions could not be loaded: HTTP ${response.status}`);
        }

        return (await response.json()) as RawPlzRegionsFile;
      }),
      fetch(METRICS_PATH).then(async (response) => {
        if (!response.ok) {
          throw new Error(`PLZ metrics could not be loaded: HTTP ${response.status}`);
        }

        return (await response.json()) as RawPlzMetricsFile;
      }),
    ]).then(([regionsFile, metricsFile]) => {
      const rowsByKey = new Map<string, RawPlzMetricRow>();
      let maxParticipantCount = 0;

      for (const row of metricsFile.rows) {
        rowsByKey.set(buildMetricKey(row.plz, row.semester_time), row);
        maxParticipantCount = Math.max(maxParticipantCount, row.n);
      }

      return {
        features: regionsFile.features,
        semesterOptions: sortSemesterTimes(metricsFile.semester_times),
        maxParticipantCount,
        focus: {
          radiusKm: metricsFile.focus.radius_km,
          includedCaseCount: metricsFile.focus.included_case_count,
          excludedCaseCount: metricsFile.focus.excluded_case_count,
          includedPlzCount: metricsFile.focus.included_plz_count,
          excludedPlzCount: metricsFile.focus.excluded_plz_count,
          unmatchedCaseCount: metricsFile.focus.unmatched_case_count,
          unmatchedPlzCount: metricsFile.focus.unmatched_plz_count,
        },
        rowsByKey,
      };
    });
  }

  return plzMapDatasetCache;
}

export function buildVisiblePlzRegionMetrics(
  dataset: PlzMapDataset,
  semesterTime: string,
  statusGroups: StatusGroupKey[],
): PlzRegionMetric[] {
  return dataset.features.map((feature) => {
    const row = dataset.rowsByKey.get(buildMetricKey(feature.properties.plz, semesterTime));
    const aggregatedMetric = buildAggregatedRegionMetric(row, statusGroups);

    return {
      plz: feature.properties.plz,
      centroid: feature.properties.centroid,
      distanceToFocusCenterKm: feature.properties.distance_to_focus_center_km,
      n: aggregatedMetric.n,
      transportCounts: aggregatedMetric.transportCounts,
      transportShares: aggregatedMetric.transportShares,
    };
  });
}