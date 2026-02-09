import { csvParse } from "d3-dsv";

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

function toBool(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true";
}

function toNumOrNull(v: string | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toStrOrNull(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

// simple cache: wird nur einmal geladen
let cache: VehicleRow[] | null = null;

export async function loadVehicleRows(): Promise<VehicleRow[]> {
  if (cache) return cache;

  const res = await fetch("/data/data_vehicle.csv");
  if (!res.ok) throw new Error(`CSV load failed: HTTP ${res.status}`);

  const text = await res.text();
  const raw = csvParse(text) as unknown as Record<string, string>[];

  cache = raw.map((r) => ({
    participant_id: Number(r.participant_id),
    plz: r.plz,
    employment_status: r.employment_status,
    semester: r.semester,
    vl: toBool(r.vl),
    semester_time: r.semester_time,
    days_present: Number(r.days_present),
    vehicle: r.vehicle,
    distance_km: toNumOrNull(r.distance_km),
    distance_km_week: toNumOrNull(r.distance_km_week),
    has_changed: toStrOrNull(r.has_changed),
    is_main_vehicle: toBool(r.is_main_vehicle),
    car_technology: toStrOrNull(r.car_technology),
  }));

  return cache;
}
export type VehicleModalSplitRow = {
  vehicle: string;
  vehicle_label: string;
  vehicle_order: number;
  count: number;
};

// deine gewünschte fixe Reihenfolge (Motorrad direkt nach Auto-Mitfahrer)
const VEHICLE_LABELS: Record<string, { label: string; order: number }> = {
  "car-driver": { label: "Auto (Fahrer:in)", order: 1 },
  "car-passenger": { label: "Auto (Beifahrer:in)", order: 2 },
  motorbike: { label: "Motorrad", order: 3 },
  bus: { label: "Bus", order: 4 },
  "train-short": { label: "Bahn (Nahverkehr)", order: 5 },
  "train-far": { label: "Bahn (Fernverkehr)", order: 6 },
  bicycle: { label: "Fahrrad", order: 7 },
  ebike: { label: "E-Bike", order: 8 },
  walk: { label: "Zu Fuß", order: 9 }
};

let modalSplitCache: Map<string, VehicleModalSplitRow[]> | null = null;

export async function loadVehicleModalSplitBySemesterTime(): Promise<
  Map<string, VehicleModalSplitRow[]>
> {
  if (modalSplitCache) return modalSplitCache;

  const rows = await loadVehicleRows();

  // semester_time -> vehicle -> count
  const counts = new Map<string, Map<string, number>>();

  for (const r of rows) {
    if (!r.is_main_vehicle) continue;

    const st = r.semester_time;
    let m = counts.get(st);
    if (!m) {
      m = new Map<string, number>();
      counts.set(st, m);
    }
    m.set(r.vehicle, (m.get(r.vehicle) ?? 0) + 1);
  }

  const out = new Map<string, VehicleModalSplitRow[]>();
  for (const [st, m] of counts) {
    const arr: VehicleModalSplitRow[] = [];
    for (const [vehicle, count] of m) {
      const info = VEHICLE_LABELS[vehicle] ?? { label: vehicle, order: 999 };
      arr.push({
        vehicle,
        vehicle_label: info.label,
        vehicle_order: info.order,
        count
      });
    }
    out.set(st, arr);
  }

  modalSplitCache = out;
  return out;
}
export type VehicleUsageByGroupRow = {
  semester_time: string;
  vehicle: string;
  vehicle_label: string;
  vehicle_order: number;
  employment_status: string;
  group_label: string;
  group_order: number;
  people: number; // distinct participant_id
};


// employment_status → deutscher Name + Reihenfolge (anpassen wenn deine Codes anders sind)
const GROUP_LABELS: Record<string, { label: string; order: number }> = {
  prof: { label: "Prof", order: 1 },
  staff: { label: "Wiss. Mitarbeiter", order: 2 },
  support: { label: "Wiss. stützend", order: 3 },
  stud: { label: "Studierende", order: 4 },
};

let usageByGroupCache: VehicleUsageByGroupRow[] | null = null;

export async function loadVehicleUsageByGroup(): Promise<VehicleUsageByGroupRow[]> {
  if (usageByGroupCache) return usageByGroupCache;

  const rows = await loadVehicleRows();

  // Key: semester|group|vehicle  -> Set(participant_id)
  const sets = new Map<string, Set<string>>();

  for (const r of rows) {
    const st = r.semester_time;
    const g = r.employment_status;
    const v = r.vehicle;
    const pid = String(r.participant_id);

    const key = `${st}|${g}|${v}`;
    let s = sets.get(key);
    if (!s) {
      s = new Set<string>();
      sets.set(key, s);
    }
    s.add(pid);
  }

  const out: VehicleUsageByGroupRow[] = [];
  for (const [key, s] of sets) {
    const [semester_time, employment_status, vehicle] = key.split("|");

    const vInfo = VEHICLE_LABELS[vehicle] ?? { label: vehicle, order: 999 };
    const gInfo = GROUP_LABELS[employment_status] ?? { label: employment_status, order: 999 };

    out.push({
      semester_time,
      vehicle,
      vehicle_label: vInfo.label,
      vehicle_order: vInfo.order,
      employment_status,
      group_label: gInfo.label,
      group_order: gInfo.order,
      people: s.size,
    });
  }

  usageByGroupCache = out;
  return out;
}

