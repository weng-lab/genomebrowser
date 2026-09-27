import { useId, useLayoutEffect, useMemo, useRef } from "react";
import type { GenomicRegion } from "../../genome/region";
import { useGenomeBrowser } from "../state/browserContextState";
import type { RegisterContentGroup } from "../viewport/useContentTransform";
import {
  getContentPlacement,
  getRenderWindow,
  PAN_OVERSCAN_MULTIPLIER,
} from "../viewport/renderWindow";
import { getHighlightRects } from "./highlightRects";

export function Highlights({
  type,
  region,
  marginWidth,
  trackWidth,
  totalHeight,
  registerContentGroup,
}: {
  type: "filled" | "outlined";
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  registerContentGroup?: RegisterContentGroup;
}) {
  const { useBrowserStore } = useGenomeBrowser();
  const assembly = useBrowserStore((state) => state.assembly);
  const highlights = useBrowserStore((state) => state.highlights);
  const clipId = useId();
  const contentGroupRef = useRef<SVGGElement>(null);
  // Share the tracks' overscan policy so highlights move with preloaded content.
  const renderRegion = useMemo(
    () =>
      getRenderWindow(region, assembly, trackWidth, PAN_OVERSCAN_MULTIPLIER)?.targetRenderRegion ??
      region,
    [assembly, region, trackWidth],
  );
  const { x: contentX, width: renderWidth } = getContentPlacement(
    renderRegion,
    region,
    trackWidth,
    marginWidth,
  );
  const rects = getHighlightRects({ highlights, region: renderRegion, width: renderWidth }).filter(
    (rect) => rect.type === type,
  );

  // Highlights don't limit a drag; they follow it across the pre-loaded window.
  useLayoutEffect(() => {
    if (!registerContentGroup || !contentGroupRef.current) return;
    return registerContentGroup(contentGroupRef.current, { x: contentX });
  }, [contentX, rects.length, registerContentGroup]);

  if (rects.length === 0) return null;

  return (
    <g pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect x={marginWidth} y={0} width={trackWidth} height={totalHeight} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g
          ref={contentGroupRef}
          transform={registerContentGroup ? undefined : `translate(${contentX},0)`}
        >
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
