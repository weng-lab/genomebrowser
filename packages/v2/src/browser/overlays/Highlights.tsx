import { useEffect, useId, useRef } from "react";
import { useBrowserStore } from "../../stores/BrowserContext";
import type { Highlight } from "../../stores/browserStore";
import type { BrowserRegion } from "../../utils/region";
import { createXScale } from "../../utils/scale";

export type HighlightRect = {
  id: string;
  x: number;
  width: number;
  color: string;
  opacity: number;
};

export function getHighlightRects({
  highlights,
  region,
  width,
}: {
  highlights: Highlight[];
  region: BrowserRegion;
  width: number;
}): HighlightRect[] {
  const xScale = createXScale(region, width);

  return highlights.flatMap((highlight) => {
    const chromosome = highlight.region.chromosome ?? region.chromosome;
    if (chromosome !== region.chromosome) return [];

    const start = xScale(highlight.region.start);
    const end = xScale(highlight.region.end);
    return [
      {
        id: highlight.id,
        x: start,
        width: end - start,
        color: highlight.color,
        opacity: highlight.opacity ?? 0.2,
      },
    ];
  });
}

export function Highlights({
  region,
  marginWidth,
  renderWidth,
  contentX,
  browserWidth,
  totalHeight,
  registerContentGroup,
}: {
  region: BrowserRegion;
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
              y={0}
              width={rect.width}
              height={totalHeight}
              fill={rect.color}
              fillOpacity={rect.opacity}
            />
          ))}
        </g>
      </g>
    </g>
  );
}
