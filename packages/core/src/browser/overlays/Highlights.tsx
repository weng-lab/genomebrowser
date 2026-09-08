import { useEffect, useId, useRef } from "react";
import type { GenomicRegion } from "../../genome/region";
import { useBrowserStore } from "../state/browserContextState";
import { getHighlightRects } from "./highlightRects";

export function Highlights({
  region,
  marginWidth,
  renderWidth,
  contentX,
  browserWidth,
  totalHeight,
  registerContentGroup,
}: {
  region: GenomicRegion;
  marginWidth: number;
  renderWidth: number;
  contentX: number;
  browserWidth: number;
  totalHeight: number;
  registerContentGroup?: (node: SVGGElement) => () => void;
}) {
  const highlights = useBrowserStore((state) => state.highlights);
  const clipId = useId();
  const contentGroupRef = useRef<SVGGElement>(null);
  const rects = getHighlightRects({ highlights, region, width: renderWidth });

  useEffect(() => {
    if (!registerContentGroup || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current);
  }, [rects.length, registerContentGroup]);

  if (rects.length === 0) return null;

  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect x={marginWidth} y={0} width={browserWidth - marginWidth} height={totalHeight} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g ref={contentGroupRef} transform={`translate(${contentX},0)`}>
          {rects.map((rect) => (
            <rect
              key={rect.id}
              x={rect.x}
              y={rect.type === "outlined" ? 1 : 0}
              width={rect.width}
              height={rect.type === "outlined" ? Math.max(0, totalHeight - 2) : totalHeight}
              fill={rect.type === "outlined" ? "none" : rect.color}
              stroke={rect.type === "outlined" ? rect.color : undefined}
              strokeWidth={rect.type === "outlined" ? 2 : undefined}
              strokeOpacity={rect.opacity}
              vectorEffect="non-scaling-stroke"
              fillOpacity={rect.opacity}
            />
          ))}
        </g>
      </g>
    </g>
  );
}
