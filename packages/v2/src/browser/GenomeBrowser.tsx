import { useCallback, useMemo, useState } from "react";
import { createDataStore } from "../data/dataStore";
import { useTrackData } from "../data/useTrackData";
import { createModuleRegistry } from "../modules/registry";
import type { AnyTrackModule } from "../modules/types";
import { BrowserProvider } from "../stores/BrowserContext";
import type { BrowserStoreInstance } from "../stores/browserStore";
import {
  createSettingsStore,
  type SettingsStoreInstance,
} from "../stores/settingsStore";
import type { TrackStoreInstance } from "../stores/trackStore";
import { createTooltipStore } from "../stores/tooltipStore";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { SvgShell } from "./SvgShell";
import { Tooltip } from "./overlays/Tooltip";
import { getTracksHeight } from "./tracks/trackLayout";
import { TrackStack } from "./tracks/TrackStack";
import { RULER_HEIGHT, Ruler } from "./viewport/Ruler";
import { SelectRegion } from "./viewport/SelectRegion";
import { useContentTransform } from "./viewport/useContentTransform";
import { usePanController } from "./viewport/usePanController";
import { useRenderWindow } from "./viewport/useRenderWindow";

const PAN_OVERSCAN_MULTIPLIER = 3;

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  modules: AnyTrackModule[];
  settingsStore?: SettingsStoreInstance;
};

export function GenomeBrowser({
  browserStore,
  trackStore,
  modules,
  settingsStore,
}: GenomeBrowserProps) {
  const region = browserStore((state) => state.region);
  const marginWidth = browserStore((state) => state.marginWidth);
  const trackWidth = browserStore((state) => state.trackWidth);
  const titleSize = browserStore((state) => state.titleSize);
  const setRegion = browserStore((state) => state.setRegion);
  const tracks = trackStore((state) => state.tracks);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const registry = useMemo(() => createModuleRegistry(modules), [modules]);
  const useDataStore = useMemo(() => createDataStore(), []);
  const tooltipStore = useMemo(() => createTooltipStore(), []);
  const internalSettingsStore = useMemo(() => createSettingsStore(), []);
  const activeSettingsStore = settingsStore ?? internalSettingsStore;
  const sideWidth = trackWidth;
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);
  const baseContentX = marginWidth - sideWidth;
  const { getContentOffset, registerContentGroup, setContentOffset } =
    useContentTransform(baseContentX);
  const {
    dataSignature,
    displayedRenderRegion,
    renderWidth,
    settleData,
    targetRenderRegion,
  } = useRenderWindow({
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

  const { dataStates, isFetching } = useTrackData({
    useDataStore,
    registry,
    tracks,
    region: targetRenderRegion,
    onSettled: () => handleDataSettled(dataSignature),
  });

  return (
    <BrowserProvider
      value={{
        trackStore,
        settingsStore: activeSettingsStore,
        tooltipStore,
        svg,
      }}
    >
      <SvgShell width={browserWidth} height={totalHeight} setSvg={setSvg}>
        <SelectRegion
          svg={svg}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          totalHeight={totalHeight}
          region={region}
          setRegion={setRegion}
          disabled={isPanLocked || isFetching}
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
            isPanLocked={isPanLocked || isFetching}
            titleSize={titleSize}
            startY={RULER_HEIGHT}
          />
        </g>
        <Tooltip width={browserWidth} height={totalHeight} />
      </SvgShell>
      <SettingsModalController registry={registry} />
    </BrowserProvider>
  );
}
