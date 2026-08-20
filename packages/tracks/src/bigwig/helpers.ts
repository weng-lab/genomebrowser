import type { SignalPoint } from "../shared/signal";
import type { YRange, YRangeOverride } from "./types";

export function getBigWigRange(points: SignalPoint[]): YRange {
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
  const range = {
    min: override?.min ?? automaticRange.min,
    max: override?.max ?? automaticRange.max,
  };
  return range.min < range.max ? range : automaticRange;
}

export function applyFillWithZero(points: SignalPoint[]) {
  for (const point of points) {
    if (point.min === null) point.min = 0;
    if (point.max === null) point.max = 0;
  }
}

export function getPointAtMouseX(points: SignalPoint[], mouseX: number, width: number) {
  if (points.length === 0 || width <= 0) return undefined;
  return points[
    Math.max(0, Math.min(points.length - 1, Math.round(mouseX * (points.length / width))))
  ];
}
export function hasBigWigData(point: SignalPoint | undefined) {
  return point !== undefined && (point.min !== null || point.max !== null);
}
export function formatBigWigTooltip(point: SignalPoint) {
  return point.max === null ? "No data" : point.max.toFixed(2);
}
export function createYScale(range: YRange, height: number) {
  const span = range.max - range.min;
  return (value: number) => (span === 0 ? height : height - ((value - range.min) * height) / span);
}
export function lighten(color: string, amount: number) {
  let hex = color.replace(/[^0-9a-f]/gi, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((value) => value + value)
      .join("");
  if (hex.length < 6) hex = "000000";
  let next = "#";
  for (let i = 0; i < 3; i += 1) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    next += Math.round(Math.min(Math.max(0, value + amount * 255), 255))
      .toString(16)
      .padStart(2, "0");
  }
  return next;
}
