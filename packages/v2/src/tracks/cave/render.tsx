import { useState, type MouseEvent } from "react";
import { useTooltip } from "../../browser/tooltip/useTooltip";
import type { TrackRendererProps } from "../../modules/types";
import {
  condenseBigWigData,
  getPointAtMouseX,
  lighten,
} from "../bigwig/helpers";
import type { RenderedBigWigPoint, YRange } from "../bigwig/types";
import type { CaveConfig, CaveData, CaveTooltipItem } from "./types";

export function FullCave({
  config,
  data,
  width,
  height,
  region,
}: TrackRendererProps<CaveConfig, CaveData>) {
  const range = { min: 0, max: 1 };
  const topPoints = condenseBigWigData(data.top, region, width);
  const bottomPoints = condenseBigWigData(data.bottom, region, width);
  const topPath = createCavePath(topPoints, range, height, "top");
  const bottomPath = createCavePath(bottomPoints, range, height, "bottom");
  const color = config.color ?? "#3333ff";

  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="#dddddd"
        strokeWidth={1}
      />
      <path d={topPath} fill={lighten(color, 0.4)} />
      <path d={bottomPath} fill={color} />
      <CaveHoverOverlay
        config={config}
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

function getCaveY(
  value: number,
  range: YRange,
  height: number,
  side: "top" | "bottom",
) {
  const span = range.max - range.min || 1;
  const normalized = (clamp(value, range) - range.min) / span;
  return side === "top" ? normalized * height : height - normalized * height;
}

function CaveHoverOverlay({
  config,
  topPoints,
  bottomPoints,
  width,
  height,
}: Pick<
  TrackRendererProps<CaveConfig, CaveData>,
  "config" | "width" | "height"
> & {
  topPoints: RenderedBigWigPoint[];
  bottomPoints: RenderedBigWigPoint[];
}) {
  const [hoveredItem, setHoveredItem] = useState<CaveTooltipItem | undefined>();
  const tooltip = useTooltip<CaveTooltipItem, CaveConfig>({ config });

  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const mouseX = getLocalMouseX(event, width);
    const top = getPointAtMouseX(topPoints, mouseX, width);
    const bottom = getPointAtMouseX(bottomPoints, mouseX, width);

    if (!top && !bottom) {
      if (hoveredItem) config.onLeave?.({ item: hoveredItem, config, event });
      setHoveredItem(undefined);
      tooltip.hide();
      return;
    }

    const item = { x: Math.round(mouseX), top, bottom };
    setHoveredItem(item);
    config.onHover?.({ item, config, event });
    tooltip.show(item, event);
  };

  const handleMouseOut = (event: MouseEvent<SVGRectElement>) => {
    if (hoveredItem) config.onLeave?.({ item: hoveredItem, config, event });
    setHoveredItem(undefined);
    tooltip.hide();
  };

  return (
    <>
      {hoveredItem && (
        <line
          x1={hoveredItem.x}
          x2={hoveredItem.x}
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
