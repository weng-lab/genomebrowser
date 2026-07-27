import { useRef, useState, type MouseEvent } from "react";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import { useInteraction } from "../../modules/interaction";
import type { TrackRendererProps } from "../../modules/types";
import { condenseBigWigData, getPointAtMouseX, lighten } from "../bigwig/helpers";
import type { RenderedBigWigPoint, YRange } from "../bigwig/types";
import type { CaveConfig, CaveData, CaveTooltipItem } from "./types";

const CAVE_SIGNAL_RANGE: YRange = { min: 0, max: 1 };

export function FullCave({
  color = "#3333ff",
  config,
  data,
  width,
  height,
  region,
}: TrackRendererProps<CaveConfig, CaveData>) {
  const topPoints = condenseBigWigData(data.top, region, width);
  const bottomPoints = condenseBigWigData(data.bottom, region, width);
  const topPath = createCavePath(topPoints, CAVE_SIGNAL_RANGE, height, "top");
  const bottomPath = createCavePath(bottomPoints, CAVE_SIGNAL_RANGE, height, "bottom");
  const bottomColor = config.bottomColor ?? color;
  const topColor = config.topColor ?? lighten(bottomColor, 0.5);
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="#dddddd" strokeWidth={1} />
      <path d={topPath} fill={topColor} />
      <path d={bottomPath} fill={bottomColor} />
      <CaveHoverOverlay
        topPoints={topPoints}
        bottomPoints={bottomPoints}
        width={width}
        height={height}
      />
    </g>
  );
}

function createCavePath(
  points: RenderedBigWigPoint[],
  range: YRange,
  height: number,
  side: "top" | "bottom",
) {
  const baseline = side === "top" ? 0 : height;
  let path = `M 0 ${baseline}`;

  for (const point of points) {
    if (point.max === null) continue;

    const signalY = getCaveY(point.max, range, height, side);
    const x2 = point.x + 1;
    path += ` L ${point.x} ${baseline} L ${point.x} ${signalY} L ${x2} ${signalY} L ${x2} ${baseline}`;
  }

  return path;
}

function getCaveY(value: number, range: YRange, height: number, side: "top" | "bottom") {
  const span = range.max - range.min || 1;
  const normalized = (clamp(value, range) - range.min) / span;
  return side === "top" ? normalized * height : height - normalized * height;
}

function CaveHoverOverlay({
  topPoints,
  bottomPoints,
  width,
  height,
}: Pick<TrackRendererProps<CaveConfig, CaveData>, "width" | "height"> & {
  topPoints: RenderedBigWigPoint[];
  bottomPoints: RenderedBigWigPoint[];
}) {
  const [hoveredX, setHoveredX] = useState<number | undefined>();
  const hoveredItemRef = useRef<CaveTooltipItem | undefined>(undefined);
  const interaction = useInteraction<CaveTooltipItem>();
  const tooltip = useTooltip<CaveTooltipItem, CaveConfig>();

  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const mouseX = getLocalMouseX(event, width);
    const top = getPointAtMouseX(topPoints, mouseX, width);
    const bottom = getPointAtMouseX(bottomPoints, mouseX, width);

    if (!top && !bottom) {
      if (hoveredItemRef.current) interaction?.onLeave?.(hoveredItemRef.current);
      hoveredItemRef.current = undefined;
      if (hoveredX !== undefined) setHoveredX(undefined);
      tooltip.hide();
      return;
    }

    const x = Math.round(mouseX);
    const item = { x, top, bottom };
    hoveredItemRef.current = item;
    if (hoveredX !== x) setHoveredX(x);
    interaction?.onHover?.(item);
    tooltip.show(item, event);
  };

  const handleMouseOut = () => {
    if (hoveredItemRef.current) interaction?.onLeave?.(hoveredItemRef.current);
    hoveredItemRef.current = undefined;
    setHoveredX(undefined);
    tooltip.hide();
  };

  return (
    <>
      {hoveredX !== undefined && (
        <line
          x1={hoveredX}
          x2={hoveredX}
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

function clamp(value: number, range: YRange) {
  return Math.max(range.min, Math.min(range.max, value));
}
