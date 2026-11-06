import { useId, useLayoutEffect, useMemo, useRef } from "react";
import type { GenomicRegion } from "../../genome/region";
import { useGenomeBrowser } from "../state/browserContextState";
import type { RegisterContentGroup } from "../viewport/useContentTransform";
import {
  getContentPlacement,
  getRenderWindow,
  PAN_OVERSCAN_MULTIPLIER,
} from "../viewport/renderWindow";
import { HighlightRect } from "./HighlightRect";
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
    <g data-export-highlights={type} pointerEvents="none">
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
            <HighlightRect
              key={rect.id}
              x={rect.x}
              width={rect.width}
              height={totalHeight}
              color={rect.color}
              opacity={rect.opacity}
              type={rect.type}
            />
          ))}
        </g>
      </g>
    </g>
  );
}
