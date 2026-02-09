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
  walk: { label: "Zu Fuß", order: 9 },
};


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

type GroupBucket = {
  key: "student" | "employee" | "prof";
  label: string;
  order: number;
};

function groupBucket(status: string): GroupBucket | null {
  switch (status) {
    case "student":
      return { key: "student", label: "Studierende", order: 1 };
    case "wimi":
    case "niwi":
      return { key: "employee", label: "Mitarbeitende", order: 2 };
    case "prof":
      return { key: "prof", label: "Professor:innen", order: 3 };
    case "other":
    default:
      return null; // rausfiltern
  }
}

let usageByGroupCache: VehicleUsageByGroupRow[] | null = null;

export async function loadVehicleUsageByGroup(): Promise<
  VehicleUsageByGroupRow[]
> {
  if (usageByGroupCache) return usageByGroupCache;

  const rows = await loadVehicleRows();

  // Key: semester|group|vehicle  -> Set(participant_id)
  const sets = new Map<string, Set<string>>();

  for (const r of rows) {
    const st = r.semester_time;
    const bucket = groupBucket(r.employment_status);
    if (!bucket) continue;

    const v = r.vehicle;
    const pid = String(r.participant_id);

    const key = `${st}|${bucket.key}|${v}`;
    let s = sets.get(key);
    if (!s) {
      s = new Set<string>();
      sets.set(key, s);
    }
    s.add(pid);
  }

  const out: VehicleUsageByGroupRow[] = [];
  for (const [key, s] of sets) {
    const [semester_time, group_key, vehicle] = key.split("|");

    const vInfo = VEHICLE_LABELS[vehicle] ?? { label: vehicle, order: 999 };

    // group_key kommt jetzt nur noch aus unseren Buckets:
    const g =
      group_key === "student"
        ? { label: "Studierende", order: 1 }
        : group_key === "employee"
          ? { label: "Mitarbeitende", order: 2 }
          : { label: "Professor:innen", order: 3 };

    out.push({
      semester_time,
      vehicle,
      vehicle_label: vInfo.label,
      vehicle_order: vInfo.order,
      employment_status: group_key, // bleibt Feldname, ist jetzt aber bucket-key
      group_label: g.label,
      group_order: g.order,
      people: s.size,
    });
  }

  usageByGroupCache = out;
  return out;
}
