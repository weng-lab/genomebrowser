import { useInteraction, useTooltip, type TrackRendererProps } from "@weng-lab/genomebrowser";
import { useRef, useState, type MouseEvent } from "react";
import { condenseBigWigData, getPointAtMouseX, hasBigWigData } from "../bigwig/helpers";
import type { RenderedBigWigPoint, YRange } from "../bigwig/types";
import type { CaveConfig, CaveData, CaveTooltipItem } from "./types";
const range: YRange = { min: 0, max: 1 };

export function FullCave({
  config,
  data,
  width,
  height,
  region,
}: TrackRendererProps<CaveConfig, CaveData>) {
  const topPoints = condenseBigWigData(data.top, region, width);
  const bottomPoints = condenseBigWigData(data.bottom, region, width);
  return (
    <g>
      <rect width={width} height={height} fill="#ffffff" pointerEvents="none" />
      <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="#dddddd" strokeWidth={1} />
      <path d={createCavePath(topPoints, height, "top")} fill={config.topColor} />
      <path d={createCavePath(bottomPoints, height, "bottom")} fill={config.bottomColor} />
      <CaveHoverOverlay
        topPoints={topPoints}
        bottomPoints={bottomPoints}
        width={width}
        height={height}
      />
    </g>
  );
}
function createCavePath(points: RenderedBigWigPoint[], height: number, side: "top" | "bottom") {
  const baseline = side === "top" ? 0 : height;
  let path = `M 0 ${baseline}`;
  for (const point of points) {
    if (point.max === null) continue;
    const normalized = Math.max(range.min, Math.min(range.max, point.max));
    const y = side === "top" ? normalized * height : height - normalized * height;
    path += ` L ${point.x} ${baseline} L ${point.x} ${y} L ${point.x + 1} ${y} L ${point.x + 1} ${baseline}`;
  }
  return path;
}

function CaveHoverOverlay({
  topPoints,
  bottomPoints,
  width,
  height,
}: {
  topPoints: RenderedBigWigPoint[];
  bottomPoints: RenderedBigWigPoint[];
  width: number;
  height: number;
}) {
  const [hoveredX, setHoveredX] = useState<number>();
  const interactionItemRef = useRef<CaveTooltipItem | undefined>(undefined);
  const interaction = useInteraction<CaveTooltipItem>();
  const tooltip = useTooltip<CaveTooltipItem, CaveConfig>();
  const handleMouseMove = (event: MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const mouseX = box.width <= 0 ? 0 : ((event.clientX - box.left) / box.width) * width;
    const topPixel = getPointAtMouseX(topPoints, mouseX, width);
    const bottomPixel = getPointAtMouseX(bottomPoints, mouseX, width);
    if (!topPixel && !bottomPixel) {
      if (interactionItemRef.current) interaction?.onLeave?.(interactionItemRef.current);
      interactionItemRef.current = undefined;
      if (hoveredX !== undefined) setHoveredX(undefined);
      tooltip.hide();
      return;
    }
    const x = Math.round(mouseX);
    const top = hasBigWigData(topPixel) ? topPixel : undefined;
    const bottom = hasBigWigData(bottomPixel) ? bottomPixel : undefined;
    const item = top || bottom ? { x, top, bottom } : undefined;
    if (!item && interactionItemRef.current) interaction?.onLeave?.(interactionItemRef.current);
    interactionItemRef.current = item;
    if (hoveredX !== x) setHoveredX(x);
    if (item) interaction?.onHover?.(item);
    tooltip.show({ x, top: topPixel, bottom: bottomPixel }, event);
  };
  const handleMouseOut = () => {
    if (interactionItemRef.current) interaction?.onLeave?.(interactionItemRef.current);
    interactionItemRef.current = undefined;
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
