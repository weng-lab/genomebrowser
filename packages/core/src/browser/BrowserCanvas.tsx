import { useState } from "react";
import { TooltipOverlay } from "./tooltip/TooltipOverlay";
import { BrowserSvgProvider } from "./svg/BrowserSvgContext";
import { useGenomeBrowser } from "./state/browserContextState";
import { InteractionShield } from "./overlays/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { SvgShell } from "./svg/SvgShell";
import { TrackStack } from "./track-row/TrackStack";
import { useTrackLayout } from "./track-row/useTrackLayout";
import { RegionSelection } from "./viewport/RegionSelection";
import { useContentTransform } from "./viewport/useContentTransform";
import { PanStatusContext, useBrowserPan } from "./viewport/useBrowserPan";

/** Owns the SVG layers and the layout shared by tracks and overlays. */
export function BrowserCanvas({ trackWidth, scale }: { trackWidth: number; scale: number }) {
  const { useBrowserStore } = useGenomeBrowser();
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
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
      <BrowserSvgProvider svg={svg}>
        <SvgShell width={browserWidth} height={totalHeight} scale={scale} setSvg={setSvg}>
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
        </SvgShell>
        <ContextMenuController />
        <SettingsModalController />
      </BrowserSvgProvider>
    </PanStatusContext>
  );
}
