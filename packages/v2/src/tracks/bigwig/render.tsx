import { useState, type MouseEvent } from "react";
import { useInteraction } from "../../hooks/useInteraction";
import type { TrackRendererProps } from "../../modules/types";
import {
  createYScale,
  formatBigWigTooltip,
  getBigWigRange,
  getPointAtMouseX,
  lighten,
} from "./helpers";
import type { BigWigConfig, BigWigData, ValuedPoint, YRange } from "./types";

export function FullBigWig({
  config,
  data,
  width,
  height,
  panDrag,
}: TrackRendererProps<BigWigConfig, BigWigData>) {
  const range = getRenderRange(config, data);
  const y = createYScale(range, height);
  const zeroY = y(clamp(0, range));
  const paths = createSignalPaths(data.points, range, height);

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="#dddddd" strokeWidth={1} />
      {range.min < 0 && <path d={paths.minPath} fill={lighten(config.color ?? "#2266aa", 0.2)} />}
      <path d={paths.maxPath} fill={config.color ?? "#2266aa"} />
      <path d={paths.clampHighPath} stroke="#ff0000" strokeWidth={2} fill="none" />
      <path d={paths.clampLowPath} stroke="#ff0000" strokeWidth={2} fill="none" />
      <BigWigHoverOverlay config={config} data={data} width={width} height={height} panDrag={panDrag} />
    </g>
  );
}

export function DenseBigWig({
  config,
  data,
  width,
  height,
  panDrag,
}: TrackRendererProps<BigWigConfig, BigWigData>) {
  const range = getRenderRange(config, data);
  const bandY = height / 3;
  const bandHeight = height / 3;

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      {data.points.map((point) => {
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
            fill={lighten(config.color ?? "#2266aa", 0.65 - intensity * 0.65)}
          />
        );
      })}
      <BigWigHoverOverlay config={config} data={data} width={width} height={height} panDrag={panDrag} />
    </g>
  );
}

function BigWigHoverOverlay({
  config,
  data,
  width,
  height,
  panDrag,
}: Pick<TrackRendererProps<BigWigConfig, BigWigData>, "config" | "data" | "width" | "height" | "panDrag">) {
  const [hoveredPoint, setHoveredPoint] = useState<ValuedPoint | undefined>();
  const { handleHover, handleLeave } = useInteraction<ValuedPoint, BigWigConfig>({
    config,
    fallback: formatBigWigTooltip,
  });

  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const point = getPointAtMouseX(data.points, getLocalMouseX(event, width), width);
    if (!point) {
      if (hoveredPoint) handleLeave(hoveredPoint, event);
      setHoveredPoint(undefined);
      return;
    }
    setHoveredPoint(point);
    handleHover(point, event);
  };

  const handleMouseOut = (event: MouseEvent<SVGRectElement>) => {
    if (hoveredPoint) handleLeave(hoveredPoint, event);
    setHoveredPoint(undefined);
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
        style={{ cursor: panDrag?.isDragging ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseOut={handleMouseOut}
        onPointerDown={panDrag?.onPointerDown}
        onPointerMove={panDrag?.onPointerMove}
        onPointerUp={panDrag?.onPointerUp}
        onPointerCancel={panDrag?.onPointerCancel}
      />
    </>
  );
}

function getLocalMouseX(event: MouseEvent<SVGRectElement>, width: number) {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width <= 0) return 0;
  return ((event.clientX - box.left) / box.width) * width;
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
