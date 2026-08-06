import type { GenomicRegion } from "../../genome/region";
import type { BigWigData, RenderedBigWigPoint, YRange, YRangeOverride } from "./types";

export function condenseBigWigData(
  data: BigWigData[],
  region: GenomicRegion,
  width: number,
): RenderedBigWigPoint[] {
  const pixelWidth = Math.max(1, Math.floor(width));
  const points = initialPoints(pixelWidth);
  const scale = (value: number) =>
    ((value - region.start) * pixelWidth) / (region.end - region.start);

  for (const datum of data) {
    const start = Math.max(
      0,
      Math.min(pixelWidth - 1, Math.floor(scale(Math.max(datum.start, region.start)))),
    );
    const end = Math.max(
      start,
      Math.min(pixelWidth - 1, Math.floor(scale(Math.min(datum.end, region.end)))),
    );

    for (let x = start; x <= end; x += 1) {
      const point = points[x];
      point.min = point.min === null ? datum.value : Math.min(point.min, datum.value);
      point.max = point.max === null ? datum.value : Math.max(point.max, datum.value);
    }
  }

  return points;
}

export function getBigWigRange(points: RenderedBigWigPoint[]): YRange {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    if (point.min !== null) min = Math.min(min, point.min);
    if (point.max !== null) max = Math.max(max, point.max);
  }

  if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
  if (min === max) {
    if (min === 0) return { min: 0, max: 1 };
    return min < 0 ? { min, max: 0 } : { min: 0, max };
  }
  return { min, max };
}

export function resolveBigWigRange(automaticRange: YRange, override?: YRangeOverride): YRange {
  const resolvedRange = {
    min: override?.min ?? automaticRange.min,
    max: override?.max ?? automaticRange.max,
  };
  return resolvedRange.min < resolvedRange.max ? resolvedRange : automaticRange;
}

export function applyFillWithZero(points: RenderedBigWigPoint[]) {
  for (const point of points) {
    if (point.min === null) point.min = 0;
    if (point.max === null) point.max = 0;
  }
}

export function getPointAtMouseX(points: RenderedBigWigPoint[], mouseX: number, width: number) {
  if (points.length === 0 || width <= 0) return undefined;
  const scale = points.length / width;
  const index = Math.max(0, Math.min(points.length - 1, Math.round(mouseX * scale)));
  return points[index];
}

export function hasBigWigData(point: RenderedBigWigPoint | undefined) {
  return point !== undefined && (point.min !== null || point.max !== null);
}

export function formatBigWigTooltip(point: RenderedBigWigPoint) {
  return point.max === null ? "No data" : point.max.toFixed(2);
}

export function createYScale(range: YRange, height: number) {
  const span = range.max - range.min;
  return (value: number) => (span === 0 ? height : height - ((value - range.min) * height) / span);
}

export function lighten(color: string, amount: number) {
  const hex = normalizeHex(color);
  let next = "#";
  for (let i = 0; i < 3; i += 1) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    const channel = Math.round(Math.min(Math.max(0, value + amount * 255), 255)).toString(16);
    next += channel.padStart(2, "0");
  }
  return next;
}

function initialPoints(width: number): RenderedBigWigPoint[] {
  return Array.from({ length: width }, (_, x) => ({ x, min: null, max: null }));
}

function normalizeHex(color: string) {
  let hex = color.replace(/[^0-9a-f]/gi, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((value) => value + value)
      .join("");
  if (hex.length >= 6) return hex.slice(0, 6);
  return "000000";
}
