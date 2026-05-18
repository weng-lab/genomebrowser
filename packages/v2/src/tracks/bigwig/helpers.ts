import type { BrowserRegion } from "../../utils/region";
import type { BigWigDatum, ValuedPoint, YRange } from "./types";

export function condenseBigWigData(data: BigWigDatum[], region: BrowserRegion, width: number): ValuedPoint[] {
  const pixelWidth = Math.max(1, Math.floor(width));
  const points = initialPoints(pixelWidth);
  const scale = (value: number) => ((value - region.start) * pixelWidth) / (region.end - region.start);

  for (const datum of data) {
    const start = Math.max(0, Math.min(pixelWidth - 1, Math.floor(scale(Math.max(datum.start, region.start)))));
    const end = Math.max(start, Math.min(pixelWidth - 1, Math.floor(scale(Math.min(datum.end, region.end)))));

    for (let x = start; x <= end; x += 1) {
      const point = points[x];
      point.min = point.min === null ? datum.value : Math.min(point.min, datum.value);
      point.max = point.max === null ? datum.value : Math.max(point.max, datum.value);
    }
  }

  return points;
}

export function getBigWigRange(points: ValuedPoint[]): YRange {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    if (point.min !== null) min = Math.min(min, point.min);
    if (point.max !== null) max = Math.max(max, point.max);
  }

  if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
  if (min === max) return { min: Math.min(0, min), max: max === 0 ? 1 : max };
  return { min, max };
}

export function applyFillWithZero(points: ValuedPoint[]) {
  for (const point of points) {
    if (point.min === null) point.min = 0;
    if (point.max === null) point.max = 0;
  }
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

function initialPoints(width: number): ValuedPoint[] {
  return Array.from({ length: width }, (_, x) => ({ x, min: null, max: null }));
}

function normalizeHex(color: string) {
  let hex = color.replace(/[^0-9a-f]/gi, "");
  if (hex.length === 3) hex = hex.split("").map((value) => value + value).join("");
  if (hex.length >= 6) return hex.slice(0, 6);
  return "000000";
}
