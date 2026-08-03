import type { GenomicRegion } from "../../genome/region";
import { condenseBigWigData, lighten } from "../bigwig/helpers";
import type { YRange } from "../bigwig/types";
import type { MethylCData, MethylCRenderedPoint } from "./types";

export function condenseMethylCChannels(
  data: MethylCData,
  region: GenomicRegion,
  width: number,
): MethylCRenderedPoint[][] {
  return data.map((channel) =>
    channel.length > 0 ? condenseBigWigData(channel, region, width) : [],
  );
}

export function generateSignal2(
  data: MethylCRenderedPoint[],
  height: number,
  color: string,
  inverted = false,
  customRange?: YRange,
  coverageData?: MethylCRenderedPoint[],
  requireCoverage = false,
) {
  const validation = validateAndNormalizeData(data, customRange);
  if (!validation) return null;

  const { range, rangeSize } = validation;
  const startY = inverted ? 0 : height;
  let pathString = m(0, startY);
  let opaquePathString = m(0, startY);
  data.forEach((point, index) => {
    if (point.min === null || point.max === null) return;
    if (requireCoverage && !hasCoverage(coverageData?.[index])) return;
    const normalized = normalizePoint(point, range, rangeSize, height, inverted);
    opaquePathString +=
      l(point.x, startY) +
      l(normalized.x, inverted ? height : 0) +
      l(normalized.x + 1, inverted ? height : 0) +
      l(point.x + 1, startY);

    pathString +=
      l(point.x, startY) +
      l(normalized.x, normalized.y) +
      l(normalized.x + 1, normalized.y) +
      l(point.x + 1, startY);
  });

  return {
    indicator: <path d={opaquePathString} fill={lighten(color, 0.25)} fillOpacity={1} />,
    values: <path d={pathString} fill={color} />,
  };
}

export function generateLineGraph(
  data: MethylCRenderedPoint[],
  height: number,
  color: string,
  inverted = false,
  customRange?: YRange,
) {
  const validation = validateAndNormalizeData(data, customRange);
  if (!validation) return null;

  const { range, rangeSize } = validation;
  let pathString = "";
  let started = false;

  data.forEach((point) => {
    if (point.min === null || point.max === null) return;
    const normalized = normalizePoint(point, range, rangeSize, height, inverted);

    if (!started) {
      pathString += m(normalized.x, normalized.y);
      started = true;
    } else {
      pathString += l(normalized.x, normalized.y);
    }
  });

  return pathString ? <path d={pathString} stroke={color} fill="none" strokeWidth="1" /> : null;
}

export function getMethylCRange(channels: MethylCRenderedPoint[][]): YRange {
  let min = Infinity;
  let max = -Infinity;

  for (const channel of channels) {
    for (const point of channel) {
      if (point.min !== null) min = Math.min(min, point.min);
      if (point.max !== null) max = Math.max(max, point.max);
    }
  }

  if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
  if (min === max) return { min: Math.min(0, min), max: max === 0 ? 1 : max };
  return { min, max };
}

function validateAndNormalizeData(data: MethylCRenderedPoint[], customRange?: YRange) {
  if (!data || data.length === 0) return null;

  const range = customRange || getMethylCRange([data]);
  const rangeSize = range.max - range.min;
  if (rangeSize <= 0) return null;

  return { range, rangeSize };
}

function normalizePoint(
  point: MethylCRenderedPoint,
  range: YRange,
  rangeSize: number,
  height: number,
  inverted: boolean,
) {
  const value = point.max ?? range.min;
  const clampedValue = Math.max(range.min, Math.min(range.max, value));
  const normalizedValue = (clampedValue - range.min) / rangeSize;
  const scaledHeight = normalizedValue * height;

  return {
    x: point.x,
    y: inverted ? scaledHeight : height - scaledHeight,
  };
}

function hasCoverage(point?: MethylCRenderedPoint) {
  return point != null && point.max != null && point.max > 0;
}

function m(x: number, y: number) {
  return `M ${x} ${y}`;
}

function l(x: number, y: number) {
  return ` L ${x} ${y}`;
}
