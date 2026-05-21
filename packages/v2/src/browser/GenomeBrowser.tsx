import { useCallback, useMemo, useState } from "react";
import { createModuleRegistry } from "../modules/registry";
import { useTrackData } from "../modules/dataController";
import type { AnyTrackModule } from "../modules/types";
import type { BrowserStoreInstance } from "../stores/browserStore";
import type { TrackStoreInstance } from "../stores/trackStore";
import { RULER_HEIGHT, Ruler } from "./Ruler";
import { SelectRegion } from "./SelectRegion";
import { SvgShell } from "./SvgShell";
import { getTracksHeight, TrackStack } from "./TrackStack";
import { useContentTransform } from "./useContentTransform";
import { usePanController } from "./usePanController";
import { useRenderWindow } from "./useRenderWindow";

const PAN_OVERSCAN_MULTIPLIER = 3;

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
  const sideWidth = trackWidth;
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);
  const baseContentX = marginWidth - sideWidth;
  const { getContentOffset, registerContentGroup, setContentOffset } =
    useContentTransform(baseContentX);
  const { displayedRenderRegion, renderWidth, settleData, targetRenderRegion } = useRenderWindow({
    region,
    tracks,
    trackWidth,
    overscanMultiplier: PAN_OVERSCAN_MULTIPLIER,
  });
  const { isPanLocked, panDrag, unlockPan } = usePanController({
    region,
    trackWidth,
    getContentOffset,
    setContentOffset,
    setRegion,
  });

  const handleDataSettled = useCallback(
    (signature: string) => {
      if (!settleData(signature)) return;
      setContentOffset(0);
      unlockPan();
    },
    [settleData, setContentOffset, unlockPan],
  );

  const dataStates = useTrackData(tracks, targetRenderRegion, renderWidth, registry, {
    keepPreviousSuccess: true,
    onSettled: handleDataSettled,
  });

  return (
    <SvgShell width={browserWidth} height={totalHeight} setSvg={setSvg}>
      <SelectRegion
        svg={svg}
        marginWidth={marginWidth}
        trackWidth={trackWidth}
        totalHeight={totalHeight}
        region={region}
        setRegion={setRegion}
        disabled={isPanLocked}
      />
      <g transform={`translate(${marginWidth},0)`}>
        <Ruler region={region} width={trackWidth} />
      </g>
      <g>
        <TrackStack
          tracks={tracks}
          dataStates={dataStates}
          registry={registry}
          region={displayedRenderRegion}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          contentX={baseContentX}
          contentWidth={renderWidth}
          registerContentGroup={registerContentGroup}
          panDrag={panDrag}
          isPanLocked={isPanLocked}
          titleSize={titleSize}
          trackStore={trackStore}
          startY={RULER_HEIGHT}
          svg={svg}
        />
      </g>
    </SvgShell>
  );
}
