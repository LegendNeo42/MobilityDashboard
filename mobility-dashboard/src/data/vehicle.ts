import { csvParse } from "d3-dsv";
import { semesterTimeOrder, sortSemesterTimes } from "../utils/semester";

export type VehicleRow = {
  participant_id: number;
  plz: string;
  employment_status: string;
  semester: string;
  vl: boolean;
  semester_time: string;
  days_present: number;
  vehicle: string;
  distance_km: number | null;
  distance_km_week: number | null;
  has_changed: string | null;
  is_main_vehicle: boolean;
  car_technology: string | null;
};

export type VehicleUsageByGroupRow = {
  semester_time: string;
  vehicle: string;
  vehicle_label: string;
  vehicle_order: number;
  employment_status: string;
  group_label: string;
  group_order: number;
  people: number;
};

export type VehicleUsageGroupSummary = {
  semester_time: string;
  employment_status: string;
  group_label: string;
  group_order: number;
  participants: number;
};

export type VehicleUsageByGroupDataset = {
  rows: VehicleUsageByGroupRow[];
  groupSummaries: VehicleUsageGroupSummary[];
  semesterOptions: string[];
};

type CsvRecord = Record<string, string>;

type GroupBucket = {
  key: "student" | "employee" | "prof";
  label: string;
  order: number;
};

const VEHICLE_LABELS: Record<string, { label: string; order: number }> = {
  "car-driver": { label: "Auto (Fahrer:in)", order: 1 },
  "car-passenger": { label: "Auto (Beifahrer:in)", order: 2 },
  motorbike: { label: "Motorrad", order: 3 },
  bus: { label: "Bus", order: 4 },
  "train-short": { label: "Bahn (Nahverkehr)", order: 5 },
  "train-far": { label: "Bahn (Fernverkehr)", order: 6 },
  bicycle: { label: "Fahrrad", order: 7 },
  ebike: { label: "E-Bike", order: 8 },
  walk: { label: "Zu Fuß", order: 9 },
};

const GROUP_BUCKETS_BY_KEY: Record<GroupBucket["key"], GroupBucket> = {
  student: { key: "student", label: "Studierende", order: 1 },
  employee: { key: "employee", label: "Mitarbeitende", order: 2 },
  prof: { key: "prof", label: "Professor:innen", order: 3 },
};

const semesterTimeOrderIndex = new Map(
  semesterTimeOrder.map((value, index) => [value, index]),
);

let vehicleRowsCache: VehicleRow[] | null = null;
let usageByGroupCache: VehicleUsageByGroupDataset | null = null;

function toBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function toNumOrNull(value: string | undefined): number | null {
  const normalized = (value ?? "").trim();

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStrOrNull(value: string | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

function getGroupBucket(status: string): GroupBucket | null {
  switch (status) {
    case "student":
      return GROUP_BUCKETS_BY_KEY.student;
    case "wimi":
    case "niwi":
      return GROUP_BUCKETS_BY_KEY.employee;
    case "prof":
      return GROUP_BUCKETS_BY_KEY.prof;
    default:
      return null;
  }
}

function getGroupBucketByKey(key: string): GroupBucket | null {
  return GROUP_BUCKETS_BY_KEY[key as GroupBucket["key"]] ?? null;
}

function getVehicleLabel(vehicle: string): { label: string; order: number } {
  return VEHICLE_LABELS[vehicle] ?? { label: vehicle, order: 999 };
}

function compareSemesterTimes(a: string, b: string): number {
  const aIndex = semesterTimeOrderIndex.get(a);
  const bIndex = semesterTimeOrderIndex.get(b);

  if (aIndex == null && bIndex == null) return a.localeCompare(b);
  if (aIndex == null) return 1;
  if (bIndex == null) return -1;

  return aIndex - bIndex;
}

export async function loadVehicleRows(): Promise<VehicleRow[]> {
  if (vehicleRowsCache) return vehicleRowsCache;

  const response = await fetch("/data/data_vehicle.csv");
  if (!response.ok) {
    throw new Error(`CSV load failed: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const rawRows = csvParse(csvText) as unknown as CsvRecord[];

  vehicleRowsCache = rawRows.map((row) => ({
    participant_id: Number(row.participant_id),
    plz: row.plz,
    employment_status: row.employment_status,
    semester: row.semester,
    vl: toBool(row.vl),
    semester_time: row.semester_time,
    days_present: Number(row.days_present),
    vehicle: row.vehicle,
    distance_km: toNumOrNull(row.distance_km),
    distance_km_week: toNumOrNull(row.distance_km_week),
    has_changed: toStrOrNull(row.has_changed),
    is_main_vehicle: toBool(row.is_main_vehicle),
    car_technology: toStrOrNull(row.car_technology),
  }));

  return vehicleRowsCache;
}

export async function loadVehicleUsageByGroupData(): Promise<VehicleUsageByGroupDataset> {
  if (usageByGroupCache) return usageByGroupCache;

  const rows = await loadVehicleRows();
  const usageSets = new Map<string, Set<string>>();
  const participantSets = new Map<string, Set<string>>();
  const semesterTimes = new Set<string>();

  for (const row of rows) {
    const group = getGroupBucket(row.employment_status);
    if (!group) continue;

    semesterTimes.add(row.semester_time);

    const participantId = String(row.participant_id);
    const usageKey = `${row.semester_time}|${group.key}|${row.vehicle}`;
    const participantKey = `${row.semester_time}|${group.key}`;

    let usageParticipants = usageSets.get(usageKey);
    if (!usageParticipants) {
      usageParticipants = new Set<string>();
      usageSets.set(usageKey, usageParticipants);
    }
    usageParticipants.add(participantId);

    let semesterParticipants = participantSets.get(participantKey);
    if (!semesterParticipants) {
      semesterParticipants = new Set<string>();
      participantSets.set(participantKey, semesterParticipants);
    }
    semesterParticipants.add(participantId);
  }

  const usageRows: VehicleUsageByGroupRow[] = [];
  for (const [key, participants] of usageSets.entries()) {
    const [semester_time, groupKey, vehicle] = key.split("|");
    const group = getGroupBucketByKey(groupKey);
    const vehicleInfo = getVehicleLabel(vehicle);

    if (!group) continue;

    usageRows.push({
      semester_time,
      vehicle,
      vehicle_label: vehicleInfo.label,
      vehicle_order: vehicleInfo.order,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      people: participants.size,
    });
  }

  const groupSummaries: VehicleUsageGroupSummary[] = [];
  for (const [key, participants] of participantSets.entries()) {
    const [semester_time, groupKey] = key.split("|");
    const group = getGroupBucketByKey(groupKey);

    if (!group) continue;

    groupSummaries.push({
      semester_time,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      participants: participants.size,
    });
  }

  usageByGroupCache = {
    rows: usageRows.sort((a, b) => {
      const semesterComparison = compareSemesterTimes(
        a.semester_time,
        b.semester_time,
      );
      if (semesterComparison !== 0) return semesterComparison;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      return a.vehicle_order - b.vehicle_order;
    }),
    groupSummaries: groupSummaries.sort((a, b) => {
      const semesterComparison = compareSemesterTimes(
        a.semester_time,
        b.semester_time,
      );
      if (semesterComparison !== 0) return semesterComparison;
      return a.group_order - b.group_order;
    }),
    semesterOptions: sortSemesterTimes(Array.from(semesterTimes)),
  };

  return usageByGroupCache;
}