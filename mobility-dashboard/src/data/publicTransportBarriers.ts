import { loadCsvRows, toBool } from "./csv";
import {
  getPublicTransportBarrierDefinition,
  getStatusGroupByKey,
  getStatusGroupBySourceStatus,
  getTransportModeDefinition,
} from "./domain";
import type { StatusGroupKey } from "./domain";

export type PublicTransportBarrierRow = {
  barrier: string;
  barrier_label: string;
  barrier_order: number;
  response_key: "yes" | "no";
  response_label: string;
  response_order: number;
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  main_vehicle: string;
  main_vehicle_label: string;
  main_vehicle_order: number;
  people: number;
};

export type PublicTransportBarrierSegmentSummary = {
  employment_status: StatusGroupKey;
  group_label: string;
  group_order: number;
  main_vehicle: string;
  main_vehicle_label: string;
  main_vehicle_order: number;
  participants: number;
};

export type PublicTransportBarrierSegmentOption = {
  key: string;
  label: string;
  order: number;
  participants: number;
};

export type PublicTransportBarrierDataset = {
  rows: PublicTransportBarrierRow[];
  segmentSummaries: PublicTransportBarrierSegmentSummary[];
  segmentOptions: PublicTransportBarrierSegmentOption[];
};

let publicTransportBarrierCache: PublicTransportBarrierDataset | null = null;

function buildPublicTransportBarrierDataset(
  rows: Array<Record<string, string>>,
): PublicTransportBarrierDataset {
  const responseSets = new Map<string, Set<string>>();
  const segmentSets = new Map<string, Set<string>>();

  for (const row of rows) {
    const participantId = row.participant_id?.trim();
    const mainVehicle = row.main_vehicle?.trim();
    const statusGroup = getStatusGroupBySourceStatus(row.status?.trim() ?? "");

    if (!participantId || !mainVehicle || !statusGroup) continue;

    const group = getStatusGroupByKey(statusGroup.key);
    if (!group) continue;

    const barrier = getPublicTransportBarrierDefinition(row.topic?.trim() ?? "");
    const transportMode = getTransportModeDefinition(mainVehicle);
    const responseKey = toBool(row.response) ? "yes" : "no";
    const responseOrder = responseKey === "no" ? 1 : 2;

    const responseSetKey = [
      group.key,
      transportMode.key,
      barrier.key,
      responseKey,
    ].join("|");

    let responseParticipants = responseSets.get(responseSetKey);
    if (!responseParticipants) {
      responseParticipants = new Set<string>();
      responseSets.set(responseSetKey, responseParticipants);
    }
    responseParticipants.add(participantId);

    const segmentKey = [group.key, transportMode.key].join("|");
    let segmentParticipants = segmentSets.get(segmentKey);
    if (!segmentParticipants) {
      segmentParticipants = new Set<string>();
      segmentSets.set(segmentKey, segmentParticipants);
    }
    segmentParticipants.add(participantId);
  }

  const barrierRows: PublicTransportBarrierRow[] = [];
  for (const [key, participants] of responseSets.entries()) {
    const [groupKey, mainVehicle, barrierKey, responseKey] = key.split("|");
    const group = getStatusGroupByKey(groupKey);

    if (!group) continue;

    const barrier = getPublicTransportBarrierDefinition(barrierKey);
    const transportMode = getTransportModeDefinition(mainVehicle);

    barrierRows.push({
      barrier: barrier.key,
      barrier_label: barrier.label,
      barrier_order: barrier.order,
      response_key: responseKey === "yes" ? "yes" : "no",
      response_label: responseKey === "yes" ? "Ja" : "Nein",
      response_order: responseKey === "no" ? 1 : 2,
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      main_vehicle: transportMode.key,
      main_vehicle_label: transportMode.label,
      main_vehicle_order: transportMode.order,
      people: participants.size,
    });
  }

  const segmentSummaries: PublicTransportBarrierSegmentSummary[] = [];
  for (const [key, participants] of segmentSets.entries()) {
    const [groupKey, mainVehicle] = key.split("|");
    const group = getStatusGroupByKey(groupKey);

    if (!group) continue;

    const transportMode = getTransportModeDefinition(mainVehicle);

    segmentSummaries.push({
      employment_status: group.key,
      group_label: group.label,
      group_order: group.order,
      main_vehicle: transportMode.key,
      main_vehicle_label: transportMode.label,
      main_vehicle_order: transportMode.order,
      participants: participants.size,
    });
  }

  const segmentParticipantsByMode = new Map<string, number>();
  for (const summary of segmentSummaries) {
    const current = segmentParticipantsByMode.get(summary.main_vehicle) ?? 0;
    segmentParticipantsByMode.set(
      summary.main_vehicle,
      current + summary.participants,
    );
  }

  const segmentOptions = Array.from(segmentParticipantsByMode.entries())
    .map(([key, participants]) => {
      const transportMode = getTransportModeDefinition(key);

      return {
        key: transportMode.key,
        label: transportMode.label,
        order: transportMode.order,
        participants,
      };
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.label.localeCompare(b.label, "de");
    });

  return {
    rows: barrierRows.sort((a, b) => {
      if (a.main_vehicle_order !== b.main_vehicle_order) {
        return a.main_vehicle_order - b.main_vehicle_order;
      }
      if (a.barrier_order !== b.barrier_order) return a.barrier_order - b.barrier_order;
      if (a.group_order !== b.group_order) return a.group_order - b.group_order;
      return a.response_order - b.response_order;
    }),
    segmentSummaries: segmentSummaries.sort((a, b) => {
      if (a.main_vehicle_order !== b.main_vehicle_order) {
        return a.main_vehicle_order - b.main_vehicle_order;
      }
      return a.group_order - b.group_order;
    }),
    segmentOptions,
  };
}

export async function loadPublicTransportBarrierData(): Promise<PublicTransportBarrierDataset> {
  if (publicTransportBarrierCache) return publicTransportBarrierCache;

  const rows = await loadCsvRows("/data/data_poll_opnv_not_used.csv");
  publicTransportBarrierCache = buildPublicTransportBarrierDataset(rows);

  return publicTransportBarrierCache;
}