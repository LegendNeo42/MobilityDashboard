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
