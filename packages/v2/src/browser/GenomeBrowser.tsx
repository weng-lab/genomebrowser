import { useCallback, useMemo, useState } from "react";
import { createDataStore } from "./data/dataStore";
import { useTrackData } from "./data/useTrackData";
import { ModuleRuntimeProvider } from "../modules/runtime/ModuleRuntimeContext";
import { createModuleRegistry } from "../modules/registry";
import type { AnyTrackModule } from "../modules/types";
import { createSettingsStore, type SettingsStoreInstance } from "./settings/settingsStore";
import { BrowserProvider } from "./stores/BrowserContext";
import type { BrowserStoreInstance } from "./stores/browserStore";
import { createContextMenuStore } from "./stores/contextMenuStore";
import type { TrackStoreInstance } from "./stores/trackStore";
import { createTooltipStore } from "./stores/tooltipStore";
import { InteractionShield } from "./interactions/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
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
  const contextMenuStore = useMemo(() => createContextMenuStore(), []);
  const tooltipStore = useMemo(() => createTooltipStore(), []);
  const internalSettingsStore = useMemo(() => createSettingsStore(), []);
  const activeSettingsStore = settingsStore ?? internalSettingsStore;
  const sideWidth = trackWidth;
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);
  const baseContentX = marginWidth - sideWidth;
  const { getContentOffset, registerContentGroup, setContentOffset } =
    useContentTransform(baseContentX);
  const { dataKey, displayedRenderRegion, renderWidth, settleData, targetRenderRegion } =
    useRenderWindow({
      region,
      tracks,
      trackWidth,
      overscanMultiplier: PAN_OVERSCAN_MULTIPLIER,
    });
  const { isPanLocked, panDrag, unlockPan } = usePanController({
    svg,
    region,
    trackWidth,
    getContentOffset,
    setContentOffset,
    setRegion,
    onPanStart: tooltipStore.getState().hideTooltip,
  });
  const moduleRuntime = useMemo(
    () => ({
      svg,
      isPanning: panDrag.isDragging,
      showTooltip: tooltipStore.getState().showTooltip,
      hideTooltip: tooltipStore.getState().hideTooltip,
      getTrackHeight: (trackId: string) => trackStore.getState().getTrack(trackId)?.height,
      updateTrack: trackStore.getState().updateTrack,
    }),
    [panDrag.isDragging, svg, tooltipStore, trackStore],
  );

  const handleDataSettled = useCallback(
    (key: string) => {
      if (!settleData(key)) return;
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
    onSettled: () => handleDataSettled(dataKey),
  });
  const isInteractionBlocked = isPanLocked || isFetching;

  return (
    <BrowserProvider
      value={{
        browserStore,
        trackStore,
        contextMenuStore,
        settingsStore: activeSettingsStore,
        tooltipStore,
        svg,
        isPanning: panDrag.isDragging,
        isInteractionBlocked,
      }}
    >
      <ModuleRuntimeProvider value={moduleRuntime}>
        <SvgShell width={browserWidth} height={totalHeight} setSvg={setSvg}>
          <SelectRegion
            svg={svg}
            marginWidth={marginWidth}
            trackWidth={trackWidth}
            totalHeight={totalHeight}
            region={region}
            setRegion={setRegion}
            disabled={isInteractionBlocked}
          >
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
                isPanLocked={isInteractionBlocked}
                titleSize={titleSize}
                startY={RULER_HEIGHT}
              />
            </g>
            <Highlights
              region={displayedRenderRegion}
              marginWidth={marginWidth}
              renderWidth={renderWidth}
              contentX={baseContentX}
              browserWidth={browserWidth}
              totalHeight={totalHeight}
              registerContentGroup={registerContentGroup}
            />
          </SelectRegion>
          <Tooltip width={browserWidth} height={totalHeight} />
          <InteractionShield
            active={isInteractionBlocked}
            width={browserWidth}
            height={totalHeight}
          />
        </SvgShell>
        <ContextMenuController registry={registry} />
        <SettingsModalController registry={registry} />
      </ModuleRuntimeProvider>
    </BrowserProvider>
  );
}
