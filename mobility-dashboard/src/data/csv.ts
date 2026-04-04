import { csvParse } from "d3-dsv";

type CsvRecord = Record<string, string>;

const csvTextCache = new Map<string, Promise<string>>();
const csvRowsCache = new Map<string, Promise<CsvRecord[]>>();

export function toBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

export function toNumOrNull(value: string | undefined): number | null {
  const normalized = (value ?? "").trim();

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toStrOrNull(value: string | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

export async function loadCsvText(path: string): Promise<string> {
  let cachedPromise = csvTextCache.get(path);

  if (!cachedPromise) {
    cachedPromise = fetch(path).then(async (response) => {
      if (!response.ok) {
        throw new Error(`CSV load failed: HTTP ${response.status}`);
      }

      return response.text();
    });

    csvTextCache.set(path, cachedPromise);
  }

  return cachedPromise;
}

export async function loadCsvRows(path: string): Promise<CsvRecord[]> {
  let cachedPromise = csvRowsCache.get(path);

  if (!cachedPromise) {
    cachedPromise = loadCsvText(path).then(
      (csvText) => csvParse(csvText) as unknown as CsvRecord[],
    );

    csvRowsCache.set(path, cachedPromise);
  }

  return cachedPromise;
}