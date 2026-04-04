import { loadCsvRows, toBool, toNumOrNull, toStrOrNull } from "./csv";
import {
  getDistanceBucketDefinition,
  getStatusGroupByKey,
  getStatusGroupBySourceStatus,
  getTransportModeDefinition,
} from "./domain";
import type { StatusGroupKey } from "./domain";
import { semesterTimeOrder, sortSemesterTimes } from "../utils/semester";

export type VehicleRow = {
  participant_id: number;
  plz: string;
  employment_status: string;
  status_group: StatusGroupKey | null;
  semester: string;
  vl: boolean;
  semester_time: string;
  days_present: number;
  vehicle: string;
  vehicle_label: string;
  vehicle_order: number;
  distance_km: number | null;
  distance_bucket: string | null;
  distance_bucket_label: string | null;
  distance_bucket_order: number | null;
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
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  people: number;
};

export type VehicleUsageGroupSummary = {
  semester_time: string;
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  participants: number;
};

export type VehicleUsageByGroupDataset = {
  rows: VehicleUsageByGroupRow[];
  groupSummaries: VehicleUsageGroupSummary[];
  semesterOptions: string[];
};

export type ModalSplitByDistanceRow = {
  semester_time: string;
  distance_bucket: string;
  distance_bucket_label: string;
  distance_bucket_order: number;
  vehicle: string;
  vehicle_label: string;
  vehicle_order: number;
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  people: number;
};

export type ModalSplitByDistanceBucketSummary = {
  semester_time: string;
  distance_bucket: string;
  distance_bucket_label: string;
  distance_bucket_order: number;
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  participants: number;
};

export type ModalSplitByDistanceDataset = {
  rows: ModalSplitByDistanceRow[];
  bucketSummaries: ModalSplitByDistanceBucketSummary[];
  semesterOptions: string[];
};

const semesterTimeOrderIndex = new Map(
  semesterTimeOrder.map((value, index) => [value, index]),
);

let vehicleRowsCache: VehicleRow[] | null = null;
let usageByGroupCache: VehicleUsageByGroupDataset | null = null;
let modalSplitByDistanceCache: ModalSplitByDistanceDataset | null = null;

function compareSemesterTimes(a: string, b: string): number {
  const aIndex = semesterTimeOrderIndex.get(a);
  const bIndex = semesterTimeOrderIndex.get(b);

  if (aIndex == null && bIndex == null) return a.localeCompare(b);
  if (aIndex == null) return 1;
  if (bIndex == null) return -1;

  return aIndex - bIndex;
}

function buildParticipantKey(row: VehicleRow): string {
  return `${row.participant_id}|${row.semester_time}`;
}

export async function loadVehicleRows(): Promise<VehicleRow[]> {
  if (vehicleRowsCache) return vehicleRowsCache;

  const rawRows = await loadCsvRows("/data/data_vehicle.csv");

  vehicleRowsCache = rawRows.map((row) => {
    const statusGroup = getStatusGroupBySourceStatus(row.employment_status);
    const transportMode = getTransportModeDefinition(row.vehicle);
    const distanceKm = toNumOrNull(row.distance_km);
    const distanceBucket = getDistanceBucketDefinition(distanceKm);

    return {
      participant_id: Number(row.participant_id),
      plz: row.plz,
      employment_status: row.employment_status,
      status_group: statusGroup?.key ?? null,
      semester: row.semester,
      vl: toBool(row.vl),
      semester_time: row.semester_time,
      days_present: Number(row.days_present),
      vehicle: row.vehicle,
      vehicle_label: transportMode.label,
      vehicle_order: transportMode.order,
      distance_km: distanceKm,
      distance_bucket: distanceBucket?.key ?? null,
      distance_bucket_label: distanceBucket?.label ?? null,
      distance_bucket_order: distanceBucket?.order ?? null,
      distance_km_week: toNumOrNull(row.distance_km_week),
      has_changed: toStrOrNull(row.has_changed),
      is_main_vehicle: toBool(row.is_main_vehicle),
      car_technology: toStrOrNull(row.car_technology),
    };
  });

  return vehicleRowsCache;
}

export function buildVehicleUsageByGroupDataset(
  rows: VehicleRow[],
): VehicleUsageByGroupDataset {
  const usageSets = new Map<string, Set<string>>();
  const participantSets = new Map<string, Set<string>>();
  const semesterTimes = new Set<string>();

  for (const row of rows) {
    const statusGroup = row.status_group;
    if (!statusGroup) continue;

    const group = getStatusGroupByKey(statusGroup);
    if (!group) continue;

    semesterTimes.add(row.semester_time);

    const participantKey = buildParticipantKey(row);
    const usageKey = `${row.semester_time}|${group.key}|${row.vehicle}`;
    const participantSummaryKey = `${row.semester_time}|${group.key}`;

    let usageParticipants = usageSets.get(usageKey);
    if (!usageParticipants) {
      usageParticipants = new Set<string>();
      usageSets.set(usageKey, usageParticipants);
    }
    usageParticipants.add(participantKey);

    let groupParticipants = participantSets.get(participantSummaryKey);
    if (!groupParticipants) {
      groupParticipants = new Set<string>();
      participantSets.set(participantSummaryKey, groupParticipants);
    }
    groupParticipants.add(participantKey);
  }

  const usageRows: VehicleUsageByGroupRow[] = [];
  for (const [key, participants] of usageSets.entries()) {
    const [semester_time, groupKey, vehicle] = key.split("|");
    const group = getStatusGroupByKey(groupKey);
    const transportMode = getTransportModeDefinition(vehicle);

    if (!group) continue;

    usageRows.push({
      semester_time,
      vehicle,
      vehicle_label: transportMode.label,
      vehicle_order: transportMode.order,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      people: participants.size,
    });
  }

  const groupSummaries: VehicleUsageGroupSummary[] = [];
  for (const [key, participants] of participantSets.entries()) {
    const [semester_time, groupKey] = key.split("|");
    const group = getStatusGroupByKey(groupKey);

    if (!group) continue;

    groupSummaries.push({
      semester_time,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      participants: participants.size,
    });
  }

  return {
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
}

export function buildModalSplitByDistanceDataset(
  rows: VehicleRow[],
): ModalSplitByDistanceDataset {
  const modalSplitSets = new Map<string, Set<string>>();
  const bucketParticipantSets = new Map<string, Set<string>>();
  const bucketMetaByKey = new Map<string, { label: string; order: number }>();
  const semesterTimes = new Set<string>();

  for (const row of rows) {
    if (!row.is_main_vehicle) continue;
    if (!row.status_group) continue;
    if (
      !row.distance_bucket ||
      !row.distance_bucket_label ||
      row.distance_bucket_order == null
    ) {
      continue;
    }

    const group = getStatusGroupByKey(row.status_group);
    if (!group) continue;

    semesterTimes.add(row.semester_time);

    const participantKey = buildParticipantKey(row);
    const bucketSummaryKey = [
      row.semester_time,
      row.status_group,
      row.distance_bucket,
    ].join("|");
    const modalSplitKey = [bucketSummaryKey, row.vehicle].join("|");

    bucketMetaByKey.set(bucketSummaryKey, {
      label: row.distance_bucket_label,
      order: row.distance_bucket_order,
    });

    let modalSplitParticipants = modalSplitSets.get(modalSplitKey);
    if (!modalSplitParticipants) {
      modalSplitParticipants = new Set<string>();
      modalSplitSets.set(modalSplitKey, modalSplitParticipants);
    }
    modalSplitParticipants.add(participantKey);

    let bucketParticipants = bucketParticipantSets.get(bucketSummaryKey);
    if (!bucketParticipants) {
      bucketParticipants = new Set<string>();
      bucketParticipantSets.set(bucketSummaryKey, bucketParticipants);
    }
    bucketParticipants.add(participantKey);
  }

  const modalSplitRows: ModalSplitByDistanceRow[] = [];
  for (const [key, participants] of modalSplitSets.entries()) {
    const [semester_time, groupKey, distanceBucketKey, vehicle] = key.split("|");
    const group = getStatusGroupByKey(groupKey);
    const transportMode = getTransportModeDefinition(vehicle);

    if (!group) continue;

    const distanceBucket = bucketMetaByKey.get(
      [semester_time, groupKey, distanceBucketKey].join("|"),
    );

    if (!distanceBucket) continue;

    modalSplitRows.push({
      semester_time,
      distance_bucket: distanceBucketKey,
      distance_bucket_label: distanceBucket.label,
      distance_bucket_order: distanceBucket.order,
      vehicle,
      vehicle_label: transportMode.label,
      vehicle_order: transportMode.order,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      people: participants.size,
    });
  }

  const bucketSummaries: ModalSplitByDistanceBucketSummary[] = [];
  for (const [key, participants] of bucketParticipantSets.entries()) {
    const [semester_time, groupKey, distanceBucketKey] = key.split("|");
    const group = getStatusGroupByKey(groupKey);

    if (!group) continue;

    const distanceBucket = bucketMetaByKey.get(
      [semester_time, groupKey, distanceBucketKey].join("|"),
    );

    if (!distanceBucket) continue;

    bucketSummaries.push({
      semester_time,
      distance_bucket: distanceBucketKey,
      distance_bucket_label: distanceBucket.label,
      distance_bucket_order: distanceBucket.order,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      participants: participants.size,
    });
  }

  return {
    rows: modalSplitRows.sort((a, b) => {
      const semesterComparison = compareSemesterTimes(
        a.semester_time,
        b.semester_time,
      );
      if (semesterComparison !== 0) return semesterComparison;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      if (a.distance_bucket_order !== b.distance_bucket_order) {
        return a.distance_bucket_order - b.distance_bucket_order;
      }
      return a.vehicle_order - b.vehicle_order;
    }),
    bucketSummaries: bucketSummaries.sort((a, b) => {
      const semesterComparison = compareSemesterTimes(
        a.semester_time,
        b.semester_time,
      );
      if (semesterComparison !== 0) return semesterComparison;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      return a.distance_bucket_order - b.distance_bucket_order;
    }),
    semesterOptions: sortSemesterTimes(Array.from(semesterTimes)),
  };
}

export async function loadVehicleUsageByGroupData(): Promise<VehicleUsageByGroupDataset> {
  if (usageByGroupCache) return usageByGroupCache;

  usageByGroupCache = buildVehicleUsageByGroupDataset(await loadVehicleRows());
  return usageByGroupCache;
}

export async function loadModalSplitByDistanceData(): Promise<ModalSplitByDistanceDataset> {
  if (modalSplitByDistanceCache) return modalSplitByDistanceCache;

  modalSplitByDistanceCache = buildModalSplitByDistanceDataset(
    await loadVehicleRows(),
  );

  return modalSplitByDistanceCache;
}