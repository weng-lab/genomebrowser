import type { TrackRendererProps } from "../../modules/types";
import { createYScale, getBigWigRange, lighten } from "./helpers";
import type { BigWigConfig, BigWigData, ValuedPoint, YRange } from "./types";

export function FullBigWig({ track, data, width, height }: TrackRendererProps<BigWigConfig, BigWigData>) {
  const range = getRenderRange(track, data);
  const y = createYScale(range, height);
  const zeroY = y(clamp(0, range));
  const paths = createSignalPaths(data.points, range, height);

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" />
      <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="#dddddd" strokeWidth={1} />
      {range.min < 0 && <path d={paths.minPath} fill={lighten(track.color ?? "#2266aa", 0.2)} />}
      <path d={paths.maxPath} fill={track.color ?? "#2266aa"} />
      <path d={paths.clampHighPath} stroke="#ff0000" strokeWidth={2} fill="none" />
      <path d={paths.clampLowPath} stroke="#ff0000" strokeWidth={2} fill="none" />
    </g>
  );
}

export function DenseBigWig({ track, data, width, height }: TrackRendererProps<BigWigConfig, BigWigData>) {
  const range = getRenderRange(track, data);
  const bandY = height / 3;
  const bandHeight = height / 3;

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" />
      {data.points.map((point) => {
        const value = point.max ?? point.min;
        const intensity = value === null ? 0 : (clamp(value, range) - range.min) / (range.max - range.min || 1);
        return (
          <rect
            key={point.x}
            x={point.x}
            y={bandY}
            width={1}
            height={bandHeight}
            fill={lighten(track.color ?? "#2266aa", 0.65 - intensity * 0.65)}
          />
        );
      })}
    </g>
  );
}

function getRenderRange(track: BigWigConfig, data: BigWigData): YRange {
  return track.yRange ?? data.range ?? getBigWigRange(data.points);
}

function createSignalPaths(points: ValuedPoint[], range: YRange, height: number) {
  const y = createYScale(range, height);
  const zeroY = y(clamp(0, range));
  let minPath = `M 0 ${zeroY}`;
  let maxPath = `M 0 ${zeroY}`;
  let clampHighPath = "";
  let clampLowPath = "";

  for (const point of points) {
    if (point.min === null || point.max === null) continue;

    const clampedMin = clamp(point.min, range);
    const clampedMax = clamp(point.max, range);
    const minY = y(clampedMin);
    const maxY = y(clampedMax);
    const x2 = point.x + 1;

    minPath += ` L ${point.x} ${zeroY} L ${point.x} ${minY} L ${x2} ${minY} L ${x2} ${zeroY}`;
    maxPath += ` L ${point.x} ${zeroY} L ${point.x} ${maxY} L ${x2} ${maxY} L ${x2} ${zeroY}`;

    if (point.max > range.max) clampHighPath += `M ${point.x} 0 l 0 2 `;
    if (point.min < range.min) clampLowPath += `M ${point.x} ${height} l 0 -2 `;
  }

  return { minPath, maxPath, clampHighPath, clampLowPath };
}

function clamp(value: number, range: YRange) {
  return Math.max(range.min, Math.min(range.max, value));
}
