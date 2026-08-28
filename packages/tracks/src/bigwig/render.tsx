import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRef, useState, type MouseEvent } from "react";
import {
  applyFillWithZero,
  createYScale,
  getBigWigRange,
  getPointAtMouseX,
  hasBigWigData,
  lighten,
  resolveBigWigRange,
} from "./helpers";
import { clientXToTrackX } from "../shared/coordinates";
import { condenseSignalRecords, type SignalPoint } from "../shared/signal";
import type { BigWigConfig, BigWigData, YRange } from "./types";

export function FullBigWig({
  config,
  color,
  data,
  width,
  height,
  visibleRegion,
  region,
}: TrackRendererProps<BigWigConfig, BigWigData>) {
  const points = getRenderedPoints(config, data, region, width);
  const range = getViewportRange(config, data, visibleRegion, region, width);
  const y = createYScale(range, height);
  const paths = createSignalPaths(points, range, height);
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line
        x1={0}
        x2={width}
        y1={y(clamp(0, range))}
        y2={y(clamp(0, range))}
        stroke="#dddddd"
        strokeWidth={1}
      />
      {range.min < 0 && <path d={paths.minPath} fill={lighten(color, 0.2)} />}
      <path d={paths.maxPath} fill={color} />
      {(config.showClampIndicators ?? true) && (
        <>
          <path
            d={paths.clampHighPath}
            stroke={config.clampIndicatorColor}
            strokeWidth={1}
            fill="none"
          />
          <path
            d={paths.clampLowPath}
            stroke={config.clampIndicatorColor}
            strokeWidth={1}
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
  color,
  data,
  width,
  height,
  visibleRegion,
  region,
}: TrackRendererProps<BigWigConfig, BigWigData>) {
  const points = getRenderedPoints(config, data, region, width);
  const range = getViewportRange(config, data, visibleRegion, region, width);
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
            y={height / 3}
            width={1}
            height={height / 3}
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
}: {
  points: SignalPoint[];
  width: number;
  height: number;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<SignalPoint>();
  const hoveredPointRef = useRef<SignalPoint | undefined>(undefined);
  const interactionPointRef = useRef<SignalPoint | undefined>(undefined);
  const interaction = useInteraction<SignalPoint>();
  const tooltip = useTooltip<SignalPoint, BigWigConfig>();
  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const point = getPointAtMouseX(points, clientXToTrackX(event.clientX, box, width), width);
    if (!point) {
      if (!hoveredPointRef.current) return;
      if (interactionPointRef.current) interaction?.onLeave?.(interactionPointRef.current);
      interactionPointRef.current = undefined;
      hoveredPointRef.current = undefined;
      setHoveredPoint(undefined);
      tooltip.hide();
      return;
    }
    if (point === hoveredPointRef.current) return;
    if (!hasBigWigData(point) && interactionPointRef.current)
      interaction?.onLeave?.(interactionPointRef.current);
    interactionPointRef.current = hasBigWigData(point) ? point : undefined;
    hoveredPointRef.current = point;
    setHoveredPoint(point);
    if (interactionPointRef.current) interaction?.onHover?.(interactionPointRef.current);
    tooltip.show(point, event);
  };
  const handleMouseOut = () => {
    if (interactionPointRef.current) interaction?.onLeave?.(interactionPointRef.current);
    interactionPointRef.current = undefined;
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

function getRenderedPoints(
  config: BigWigConfig,
  data: BigWigData,
  region: TrackRendererProps<BigWigConfig, BigWigData>["region"],
  width: number,
) {
  const points = condenseSignalRecords(data, region, width);
  if (config.fillWithZero) applyFillWithZero(points);
  return points;
}

function getViewportRange(
  config: BigWigConfig,
  data: BigWigData,
  visibleRegion: TrackRendererProps<BigWigConfig, BigWigData>["visibleRegion"],
  region: TrackRendererProps<BigWigConfig, BigWigData>["region"],
  width: number,
) {
  const regionSpan = region.end - region.start;
  const visibleSpan = visibleRegion.end - visibleRegion.start;
  const visibleWidth = regionSpan > 0 ? width * (visibleSpan / regionSpan) : width;
  const points = getRenderedPoints(config, data, visibleRegion, visibleWidth);
  return resolveBigWigRange(getBigWigRange(points), config.yRange);
}

function createSignalPaths(points: SignalPoint[], range: YRange, height: number) {
  const y = createYScale(range, height);
  const zeroY = y(clamp(0, range));
  let minPath = `M 0 ${zeroY}`;
  let maxPath = `M 0 ${zeroY}`;
  let clampHighPath = "";
  let clampLowPath = "";
  for (const point of points) {
    if (point.min === null || point.max === null) continue;
    const minY = y(clamp(point.min, range));
    const maxY = y(clamp(point.max, range));
    const x2 = point.x + 1;
    const centerX = point.x + 0.5;
    minPath += ` L ${point.x} ${zeroY} L ${point.x} ${minY} L ${x2} ${minY} L ${x2} ${zeroY}`;
    maxPath += ` L ${point.x} ${zeroY} L ${point.x} ${maxY} L ${x2} ${maxY} L ${x2} ${zeroY}`;
    if (point.max > range.max) clampHighPath += `M ${centerX} 0 l 0 2 `;
    if (point.min < range.min) clampLowPath += `M ${centerX} ${height} l 0 -2 `;
  }
  return { minPath, maxPath, clampHighPath, clampLowPath };
}
function clamp(value: number, range: YRange) {
  return Math.max(range.min, Math.min(range.max, value));
}
