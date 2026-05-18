import { useMemo, useState } from "react";
import { createModuleRegistry } from "../modules/registry";
import { useTrackData } from "../modules/dataController";
import type { AnyTrackModule } from "../modules/types";
import type { BrowserStoreInstance } from "../stores/browserStore";
import type { TrackStoreInstance } from "../stores/trackStore";
import { RULER_HEIGHT, Ruler } from "./Ruler";
import { SelectRegion } from "./SelectRegion";
import { SvgShell } from "./SvgShell";
import { getTracksHeight, TrackStack } from "./TrackStack";

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  modules: AnyTrackModule[];
};

export function GenomeBrowser({ browserStore, trackStore, modules }: GenomeBrowserProps) {
  const region = browserStore((state) => state.region);
  const marginWidth = browserStore((state) => state.marginWidth);
  const trackWidth = browserStore((state) => state.trackWidth);
  const titleSize = browserStore((state) => state.titleSize);
  const setRegion = browserStore((state) => state.setRegion);
  const tracks = trackStore((state) => state.tracks);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const registry = useMemo(() => createModuleRegistry(modules), [modules]);
  const dataStates = useTrackData(tracks, region, trackWidth, registry);
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);

  return (
    <SvgShell width={browserWidth} height={totalHeight} setSvg={setSvg}>
      <SelectRegion svg={svg} marginWidth={marginWidth} trackWidth={trackWidth} totalHeight={totalHeight} region={region} setRegion={setRegion} />
      <g transform={`translate(${marginWidth},0)`}>
        <Ruler region={region} width={trackWidth} />
      </g>
      <TrackStack
        tracks={tracks}
        dataStates={dataStates}
        registry={registry}
        region={region}
        marginWidth={marginWidth}
        trackWidth={trackWidth}
        titleSize={titleSize}
        trackStore={trackStore}
        startY={RULER_HEIGHT}
      />
    </SvgShell>
  );
}
