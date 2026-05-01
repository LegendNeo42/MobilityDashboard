const DEFAULT_EXTENT = 1;

function getNiceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return DEFAULT_EXTENT;

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;

  if (normalizedStep <= 1) return magnitude;
  if (normalizedStep <= 2) return 2 * magnitude;
  if (normalizedStep <= 5) return 5 * magnitude;

  return 10 * magnitude;
}

export function getSymmetricDivergingExtent<T extends object>(
  rows: T[],
  fields: Array<keyof T>,
): number {
  const maxAbsValue = rows.reduce((maxValue, row) => {
    const rowMax = fields.reduce((fieldMax, field) => {
      const value = Number(row[field]);
      return Number.isFinite(value)
        ? Math.max(fieldMax, Math.abs(value))
        : fieldMax;
    }, 0);

    return Math.max(maxValue, rowMax);
  }, 0);

  if (maxAbsValue <= 0) return DEFAULT_EXTENT;

  const tickStep = getNiceStep(maxAbsValue / 10);
  return Math.ceil(maxAbsValue / tickStep) * tickStep;
}