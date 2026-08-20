const signalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const bedScoreFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const coordinateFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/** Formats a finite signal consistently, including the shared missing-data label. */
export function formatSignalValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? signalFormatter.format(value)
    : "No data";
}

/** Normalizes an optional BED value and caps numeric scores at two decimals. */
export function formatOptionalBedValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? bedScoreFormatter.format(value) : undefined;
  }
  if (value === undefined) return undefined;

  const text = value.trim();
  return text && text !== "." ? text : undefined;
}

/** Formats a genomic interval using the package's tooltip coordinate convention. */
export function formatGenomicInterval(start: number, end: number, chromosome?: string) {
  const interval = `${coordinateFormatter.format(start)}–${coordinateFormatter.format(end)}`;
  return chromosome ? `${chromosome}:${interval}` : interval;
}
