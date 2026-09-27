import { useEffect, useRef, useState } from "react";
import { TooltipOverlay } from "./tooltip/TooltipOverlay";
import { BrowserSvgContext } from "./svg/browserSvgState";
import { useGenomeBrowser } from "./state/browserContextState";
import { InteractionShield } from "./overlays/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { TrackStack } from "./track-row/TrackStack";
import { useTrackLayout } from "./track-row/useTrackLayout";
import { RegionSelection } from "./viewport/RegionSelection";
import { useContentTransform } from "./viewport/useContentTransform";
import { PanStatusContext, useBrowserPan } from "./viewport/useBrowserPan";

/** Owns the SVG layers and the layout shared by tracks and overlays. */
export function BrowserCanvas({ trackWidth, scale }: { trackWidth: number; scale: number }) {
  const { useBrowserStore } = useGenomeBrowser();
  const svgRef = useRef<SVGSVGElement>(null);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  // Publish the attached SVG after mount, preserving the existing attachment timing.
  useEffect(() => {
    setSvg(svgRef.current);
    return () => setSvg(null);
  }, []);
  const region = useBrowserStore((state) => state.region);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const titleSize = useBrowserStore((state) => state.titleSize);
  const { trackLayouts, totalHeight } = useTrackLayout(titleSize);
  const browserWidth = marginWidth + trackWidth;
  const { getContentOffset, registerContentGroup, setContentOffset } = useContentTransform({
    region,
    marginWidth,
    trackWidth,
  });
  const panDrag = useBrowserPan({
    svg,
    browserStore: useBrowserStore,
    trackWidth,
    content: { getContentOffset, setContentOffset },
  });

  return (
    <PanStatusContext value={panDrag.isDragging}>
      <BrowserSvgContext value={svg}>
        <svg
          id="browserSVG"
          role="group"
          aria-label="Genome browser"
          ref={svgRef}
          viewBox={`0 0 ${browserWidth} ${totalHeight}`}
          width={browserWidth * scale}
          height={totalHeight * scale}
          style={{ display: "block", background: "#ffffff", outline: "none", maxWidth: "none" }}
        >
          <RegionSelection
            svg={svg}
            marginWidth={marginWidth}
            trackWidth={trackWidth}
            totalHeight={totalHeight}
            region={region}
          >
            <Highlights
              type="filled"
              region={region}
              marginWidth={marginWidth}
              trackWidth={trackWidth}
              totalHeight={totalHeight}
              registerContentGroup={registerContentGroup}
            />
            <g>
              <TrackStack
                trackLayouts={trackLayouts}
                visibleRegion={region}
                marginWidth={marginWidth}
                trackWidth={trackWidth}
                registerContentGroup={registerContentGroup}
                panDrag={panDrag}
                titleSize={titleSize}
              />
            </g>
            <Highlights
              type="outlined"
              region={region}
              marginWidth={marginWidth}
              trackWidth={trackWidth}
              totalHeight={totalHeight}
              registerContentGroup={registerContentGroup}
            />
          </RegionSelection>
          <TooltipOverlay width={browserWidth} height={totalHeight} />
          <InteractionShield width={browserWidth} height={totalHeight} />
        </svg>
        <ContextMenuController />
        <SettingsModalController />
      </BrowserSvgContext>
    </PanStatusContext>
  );
}
