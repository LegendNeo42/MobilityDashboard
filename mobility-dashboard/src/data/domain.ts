export type StatusGroupKey = "student" | "employee" | "prof";
export type MeasureMode = "absolute" | "percent";

export type StatusGroupDefinition = {
  key: StatusGroupKey;
  label: string;
  order: number;
  color: string;
  sourceStatuses: string[];
};

export type TransportModeDefinition = {
  key: string;
  label: string;
  order: number;
};

export type DistanceBucketDefinition = {
  key: string;
  label: string;
  order: number;
  min: number;
  max: number | null;
};

export type PublicTransportBarrierDefinition = {
  key: string;
  label: string;
  order: number;
};

export type PublicTransportImprovementDefinition = {
  key: string;
  label: string;
  order: number;
};

export type BicycleImprovementDefinition = {
  key: string;
  label: string;
  order: number;
};

export type ImportanceResponseKey =
  | "very_unimportant"
  | "rather_unimportant"
  | "neutral"
  | "rather_important"
  | "very_important";

export type SurveyResponseSpecialKey = "no_opinion" | "no_answer";

export type ImportanceResponseDefinition = {
  key: ImportanceResponseKey;
  rawValue: string;
  label: string;
  order: number;
};

export const statusGroupDefinitions: StatusGroupDefinition[] = [
  {
    key: "student",
    label: "Studierende",
    order: 1,
    color: "#4c78a8",
    sourceStatuses: ["student"],
  },
  {
    key: "employee",
    label: "Mitarbeitende",
    order: 2,
    color: "#f58518",
    sourceStatuses: ["wimi", "niwi"],
  },
  {
    key: "prof",
    label: "Professor:innen",
    order: 3,
    color: "#54a24b",
    sourceStatuses: ["prof"],
  },
];

export const measureModes: Array<{ key: MeasureMode; label: string }> = [
  { key: "absolute", label: "Absolut" },
  { key: "percent", label: "Prozent" },
];

export const transportModeDefinitions: TransportModeDefinition[] = [
  { key: "car-driver", label: "Auto (Fahrer:in)", order: 1 },
  { key: "car-passenger", label: "Auto (Beifahrer:in)", order: 2 },
  { key: "motorbike", label: "Motorrad", order: 3 },
  { key: "bus", label: "Bus", order: 4 },
  { key: "train-short", label: "Bahn (Nahverkehr)", order: 5 },
  { key: "train-far", label: "Bahn (Fernverkehr)", order: 6 },
  { key: "bicycle", label: "Fahrrad", order: 7 },
  { key: "ebike", label: "E-Bike", order: 8 },
  { key: "walk", label: "Zu Fuß", order: 9 },
];

export const distanceBucketDefinitions: DistanceBucketDefinition[] = [
  { key: "0-1", label: "0 bis <1 km", order: 1, min: 0, max: 1 },
  { key: "1-2", label: "1 bis <2 km", order: 2, min: 1, max: 2 },
  { key: "2-5", label: "2 bis <5 km", order: 3, min: 2, max: 5 },
  { key: "5-10", label: "5 bis <10 km", order: 4, min: 5, max: 10 },
  { key: "10-20", label: "10 bis <20 km", order: 5, min: 10, max: 20 },
  { key: "20-50", label: "20 bis <50 km", order: 6, min: 20, max: 50 },
  { key: "50-100", label: "50 bis <100 km", order: 7, min: 50, max: 100 },
  { key: "100+", label: "100 km und mehr", order: 8, min: 100, max: null },
];

export const publicTransportBarrierDefinitions: PublicTransportBarrierDefinition[] =
  [
    { key: "travel_time", label: "Fahrt dauert zu lange", order: 1 },
    { key: "transition_time", label: "Zu viel Umstiegszeit", order: 2 },
    { key: "low_frequency", label: "Zu seltene Verbindungen", order: 3 },
    {
      key: "reliability",
      label: "Verbindungen sind unzuverlässig",
      order: 4,
    },
    { key: "too_crowded", label: "Zu voll", order: 5 },
    { key: "comfort", label: "Zu unkomfortabel", order: 6 },
    { key: "unsafe", label: "Unsicheres Gefühl", order: 7 },
    {
      key: "no_station",
      label: "Kein guter Haltepunkt erreichbar",
      order: 8,
    },
    { key: "too_expensive", label: "Zu teuer", order: 9 },
    {
      key: "live_near_uni",
      label: "Wohne nah an der Universität",
      order: 10,
    },
    { key: "other", label: "Sonstiges", order: 11 },
  ];

export const publicTransportImprovementDefinitions: PublicTransportImprovementDefinition[] =
  [
    { key: "connection", label: "Direktere Verbindungen", order: 1 },
    { key: "reliability", label: "Zuverlässigere Verbindungen", order: 2 },
    { key: "park_and_ride", label: "Park-and-Ride-Angebote", order: 3 },
    { key: "frequency", label: "Häufigere Verbindungen", order: 4 },
    { key: "lower_price", label: "Günstigere Preise", order: 5 },
  ];

export const bicycleImprovementDefinitions: BicycleImprovementDefinition[] = [
  { key: "covered_parking", label: "Überdachte Fahrradstellplätze", order: 1 },
  { key: "save_parking", label: "Sichere Fahrradstellplätze", order: 2 },
  { key: "cycling_network", label: "Bessere Radwegeverbindungen", order: 3 },
  { key: "repair_stations", label: "Reparaturstationen", order: 4 },
  { key: "showers", label: "Duschen am Campus", order: 5 },
  { key: "ebike_charging", label: "Lademöglichkeiten für E-Bikes", order: 6 },
  { key: "bike_sharing_stations", label: "Leihfahrrad-Stationen", order: 7 },
  { key: "bike_sharing_ebike", label: "Leih-E-Bikes", order: 8 },
  { key: "bike_sharing_cargo", label: "Lastenrad-Sharing", order: 9 },
];

export const importanceResponseDefinitions: ImportanceResponseDefinition[] = [
  {
    key: "very_unimportant",
    rawValue: "-2",
    label: "Sehr unwichtig",
    order: 1,
  },
  {
    key: "rather_unimportant",
    rawValue: "-1",
    label: "Eher unwichtig",
    order: 2,
  },
  {
    key: "neutral",
    rawValue: "0",
    label: "Neutral",
    order: 3,
  },
  {
    key: "rather_important",
    rawValue: "1",
    label: "Eher wichtig",
    order: 4,
  },
  {
    key: "very_important",
    rawValue: "2",
    label: "Sehr wichtig",
    order: 5,
  },
];

const statusGroupBySourceStatus = new Map<string, StatusGroupDefinition>();
const statusGroupByKey = new Map<StatusGroupKey, StatusGroupDefinition>();
const transportModeByKey = new Map<string, TransportModeDefinition>();
const barrierByKey = new Map<string, PublicTransportBarrierDefinition>();
const publicTransportImprovementByKey = new Map<
  string,
  PublicTransportImprovementDefinition
>();
const bicycleImprovementByKey = new Map<string, BicycleImprovementDefinition>();
const importanceResponseByKey = new Map<
  ImportanceResponseKey,
  ImportanceResponseDefinition
>();
const importanceResponseByRawValue = new Map<string, ImportanceResponseDefinition>();

for (const definition of statusGroupDefinitions) {
  statusGroupByKey.set(definition.key, definition);

  for (const sourceStatus of definition.sourceStatuses) {
    statusGroupBySourceStatus.set(sourceStatus, definition);
  }
}

for (const definition of transportModeDefinitions) {
  transportModeByKey.set(definition.key, definition);
}

for (const definition of publicTransportBarrierDefinitions) {
  barrierByKey.set(definition.key, definition);
}

for (const definition of publicTransportImprovementDefinitions) {
  publicTransportImprovementByKey.set(definition.key, definition);
}

for (const definition of bicycleImprovementDefinitions) {
  bicycleImprovementByKey.set(definition.key, definition);
}

for (const definition of importanceResponseDefinitions) {
  importanceResponseByKey.set(definition.key, definition);
  importanceResponseByRawValue.set(definition.rawValue, definition);
}

export const statusGroupLabels = statusGroupDefinitions.map(
  (definition) => definition.label,
);

export const statusGroupColors = statusGroupDefinitions.map(
  (definition) => definition.color,
);

export function getStatusGroupBySourceStatus(
  value: string,
): StatusGroupDefinition | null {
  return statusGroupBySourceStatus.get(value) ?? null;
}

export function getStatusGroupByKey(value: string): StatusGroupDefinition | null {
  return statusGroupByKey.get(value as StatusGroupKey) ?? null;
}

export function getTransportModeDefinition(value: string): TransportModeDefinition {
  return transportModeByKey.get(value) ?? { key: value, label: value, order: 999 };
}

export function getDistanceBucketDefinition(
  value: number | null,
): DistanceBucketDefinition | null {
  if (value == null || value < 0) return null;

  for (const definition of distanceBucketDefinitions) {
    const isWithinLowerBound = value >= definition.min;
    const isWithinUpperBound =
      definition.max == null ? true : value < definition.max;

    if (isWithinLowerBound && isWithinUpperBound) {
      return definition;
    }
  }

  return null;
}

export function getPublicTransportBarrierDefinition(
  value: string,
): PublicTransportBarrierDefinition {
  return barrierByKey.get(value) ?? { key: value, label: value, order: 999 };
}

export function getPublicTransportImprovementDefinition(
  value: string,
): PublicTransportImprovementDefinition | null {
  return publicTransportImprovementByKey.get(value) ?? null;
}

export function getBicycleImprovementDefinition(
  value: string,
): BicycleImprovementDefinition | null {
  return bicycleImprovementByKey.get(value) ?? null;
}

export function getImportanceResponseDefinitionByRawValue(
  value: string,
): ImportanceResponseDefinition | null {
  return importanceResponseByRawValue.get(value) ?? null;
}

export function getImportanceResponseDefinitionByKey(
  value: string,
): ImportanceResponseDefinition | null {
  return importanceResponseByKey.get(value as ImportanceResponseKey) ?? null;
}