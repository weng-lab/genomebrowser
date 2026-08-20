import type { GenomicRegion } from "@weng-lab/genomebrowser";
import { lighten } from "../bigwig/helpers";
import { condenseSignalRecords, type SignalPoint } from "../shared/signal";
import type { YRange } from "../bigwig/types";
import type { MethylCData } from "./types";
export function condenseMethylCChannels(data: MethylCData, region: GenomicRegion, width: number) {
  return data.map((channel) =>
    channel.length > 0 ? condenseSignalRecords(channel, region, width) : [],
  );
}
export function getMethylCRange(channels: SignalPoint[][]): YRange {
  let min = Infinity;
  let max = -Infinity;
  for (const channel of channels)
    for (const point of channel) {
      if (point.min !== null) min = Math.min(min, point.min);
      if (point.max !== null) max = Math.max(max, point.max);
    }
  if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
  if (min === max) return { min: Math.min(0, min), max: max === 0 ? 1 : max };
  return { min, max };
}
function normalize(point: SignalPoint, range: YRange, height: number, inverted: boolean) {
  const normalized =
    (Math.max(range.min, Math.min(range.max, point.max ?? range.min)) - range.min) /
    (range.max - range.min);
  return { x: point.x, y: inverted ? normalized * height : height - normalized * height };
}
export function generateSignal2(
  data: SignalPoint[],
  height: number,
  color: string,
  inverted = false,
  customRange?: YRange,
  coverageData?: SignalPoint[],
  requireCoverage = false,
) {
  if (!data.length) return null;
  const range = customRange || getMethylCRange([data]);
  if (range.max - range.min <= 0) return null;
  const startY = inverted ? 0 : height;
  let path = `M 0 ${startY}`;
  let indicator = `M 0 ${startY}`;
  data.forEach((point, index) => {
    const coverage = coverageData?.[index];
    if (
      point.min === null ||
      point.max === null ||
      (requireCoverage && (coverage?.max == null || coverage.max <= 0))
    )
      return;
    const n = normalize(point, range, height, inverted);
    indicator += ` L ${point.x} ${startY} L ${n.x} ${inverted ? height : 0} L ${n.x + 1} ${inverted ? height : 0} L ${point.x + 1} ${startY}`;
    path += ` L ${point.x} ${startY} L ${n.x} ${n.y} L ${n.x + 1} ${n.y} L ${point.x + 1} ${startY}`;
  });
  return {
    indicator: <path d={indicator} fill={lighten(color, 0.25)} fillOpacity={1} />,
    values: <path d={path} fill={color} />,
  };
}
export function generateLineGraph(
  data: SignalPoint[],
  height: number,
  color: string,
  inverted = false,
  customRange?: YRange,
) {
  if (!data.length) return null;
  const range = customRange || getMethylCRange([data]);
  if (range.max - range.min <= 0) return null;
  let path = "";
  for (const point of data) {
    if (point.min === null || point.max === null) continue;
    const n = normalize(point, range, height, inverted);
    path += path ? ` L ${n.x} ${n.y}` : `M ${n.x} ${n.y}`;
  }
  return path ? <path d={path} stroke={color} fill="none" strokeWidth="1" /> : null;
}
