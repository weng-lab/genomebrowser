import { useRef, useState, type MouseEvent } from "react";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import { useInteraction } from "../../modules/interaction";
import type { TrackRendererProps } from "../../modules/types";
import {
  applyFillWithZero,
  condenseBigWigData,
  createYScale,
  getBigWigRange,
  getPointAtMouseX,
  lighten,
} from "./helpers";
import type { BigWigConfig, BigWigData, RenderedBigWigPoint, YRange } from "./types";

export function FullBigWig({
  config,
  color = "#2266aa",
  data,
  width,
  height,
  region,
}: TrackRendererProps<BigWigConfig, BigWigData[]>) {
  const points = getRenderedPoints(config, data, region, width);
  const range = getRenderRange(config, points);
  const y = createYScale(range, height);
  const zeroY = y(clamp(0, range));
  const paths = createSignalPaths(points, range, height);

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="#dddddd" strokeWidth={1} />
      {range.min < 0 && <path d={paths.minPath} fill={lighten(color, 0.2)} />}
      <path d={paths.maxPath} fill={color} />
      {(config.showClampIndicators ?? true) && (
        <>
          <path
            d={paths.clampHighPath}
            stroke={config.clampIndicatorColor ?? "#ff0000"}
            strokeWidth={2}
            fill="none"
          />
          <path
            d={paths.clampLowPath}
            stroke={config.clampIndicatorColor ?? "#ff0000"}
            strokeWidth={2}
            fill="none"
          />
        </>
      )}
      <BigWigHoverOverlay points={points} width={width} height={height} />
    </g>
  );
}

export function DenseBigWig({
  config,
  color = "#2266aa",
  data,
  width,
  height,
  region,
}: TrackRendererProps<BigWigConfig, BigWigData[]>) {
  const points = getRenderedPoints(config, data, region, width);
  const range = getRenderRange(config, points);
  const bandY = height / 3;
  const bandHeight = height / 3;

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {points.map((point) => {
        const value = point.max ?? point.min;
        const intensity =
          value === null ? 0 : (clamp(value, range) - range.min) / (range.max - range.min || 1);
        return (
          <rect
            key={point.x}
            x={point.x}
            y={bandY}
            width={1}
            height={bandHeight}
            fill={lighten(color, 0.65 - intensity * 0.65)}
          />
        );
      })}
      <BigWigHoverOverlay points={points} width={width} height={height} />
    </g>
  );
}

function BigWigHoverOverlay({
  points,
  width,
  height,
}: Pick<TrackRendererProps<BigWigConfig, BigWigData[]>, "width" | "height"> & {
  points: RenderedBigWigPoint[];
}) {
  const [hoveredPoint, setHoveredPoint] = useState<RenderedBigWigPoint | undefined>();
  const hoveredPointRef = useRef<RenderedBigWigPoint | undefined>(undefined);
  const interaction = useInteraction<RenderedBigWigPoint>();
  const tooltip = useTooltip<RenderedBigWigPoint, BigWigConfig>();

  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const point = getPointAtMouseX(points, getLocalMouseX(event, width), width);
    if (!point) {
      if (!hoveredPointRef.current) return;
      interaction?.onLeave?.(hoveredPointRef.current);
      hoveredPointRef.current = undefined;
      setHoveredPoint(undefined);
      tooltip.hide();
      return;
    }
    if (point === hoveredPointRef.current) return;

    hoveredPointRef.current = point;
    setHoveredPoint(point);
    interaction?.onHover?.(point);
    tooltip.show(point, event);
  };

  const handleMouseOut = () => {
    if (hoveredPointRef.current) interaction?.onLeave?.(hoveredPointRef.current);
    hoveredPointRef.current = undefined;
    setHoveredPoint(undefined);
    tooltip.hide();
  };

  return (
    <>
      {hoveredPoint && (
        <line
          x1={hoveredPoint.x}
          x2={hoveredPoint.x}
          y1={0}
          y2={height}
          stroke="#000000"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        pointerEvents="all"
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
      />
    </>
  );
}

function getLocalMouseX(event: MouseEvent<SVGRectElement>, width: number) {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width <= 0) return 0;
  return ((event.clientX - box.left) / box.width) * width;
}

function getRenderedPoints(
  config: BigWigConfig,
  data: BigWigData[],
  region: TrackRendererProps<BigWigConfig, BigWigData[]>["region"],
  width: number,
) {
  const points = condenseBigWigData(data, region, width);
  if (config.fillWithZero) applyFillWithZero(points);
  return points;
}

function getRenderRange(track: BigWigConfig, points: RenderedBigWigPoint[]): YRange {
  return track.yRange ?? getBigWigRange(points);
}

function createSignalPaths(points: RenderedBigWigPoint[], range: YRange, height: number) {
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
