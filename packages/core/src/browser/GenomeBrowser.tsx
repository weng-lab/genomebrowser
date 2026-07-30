import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { createDataStore } from "./data/dataStore";
import { useTrackData } from "./data/useTrackData";
import { TooltipOverlay } from "./tooltip/TooltipOverlay";
import { TooltipProvider } from "./tooltip/TooltipProvider";
import { BrowserSvgProvider } from "./svg/BrowserSvgContext";
import { TrackHeightProvider } from "./track-row/TrackHeightProvider";
import { createSettingsStore, type SettingsStoreInstance } from "./state/settingsStore";
import { BrowserProvider, InteractionGateProvider } from "./state/BrowserContext";
import type { BrowserStoreInstance } from "./state/browserStore";
import { createContextMenuStore } from "./state/contextMenuStore";
import type { TrackStoreInstance } from "./state/trackStore";
import { InteractionShield } from "./overlays/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { RegistryProvider } from "./state/RegistryContext";
import { SvgShell } from "./svg/SvgShell";
import { getTracksHeight } from "./track-row/trackLayout";
import { TrackStack } from "./track-row/TrackStack";
import type { AnyTrackTooltipComponent } from "../modules/types";
import { RULER_HEIGHT, Ruler } from "./viewport/Ruler";
import { SelectRegion } from "./viewport/SelectRegion";
import { useContentTransform } from "./viewport/useContentTransform";
import { usePanController } from "./viewport/usePanController";
import { useRenderWindow } from "./viewport/useRenderWindow";

const PAN_OVERSCAN_MULTIPLIER = 3;

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  settingsStore?: SettingsStoreInstance;
};

export function GenomeBrowser({ browserStore, trackStore, settingsStore }: GenomeBrowserProps) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  const region = browserStore((state) => state.region);
  const assembly = browserStore((state) => state.assembly);
  const marginWidth = browserStore((state) => state.marginWidth);
  const trackWidth = browserStore((state) => state.trackWidth);
  const titleSize = browserStore((state) => state.titleSize);
  const setRegion = browserStore((state) => state.setRegion);

  const tracks = trackStore((state) => state.tracks);
  const registry = trackStore((state) => state.registry);

  const useDataStore = useMemo(() => createDataStore(), []);
  const contextMenuStore = useMemo(() => createContextMenuStore(), []);
  const internalSettingsStore = useMemo(() => createSettingsStore(), []);

  const activeSettingsStore = settingsStore ?? internalSettingsStore;
  const browserWidth = marginWidth + trackWidth;
  const totalHeight = RULER_HEIGHT + getTracksHeight(tracks, titleSize);

  const {
    dataKey,
    displayedRenderRegion,
    isDataSettled,
    renderStartOffset,
    renderWidth,
    settleData,
    targetRenderRegion,
  } = useRenderWindow({
    assembly,
    region,
    tracks,
    trackWidth,
    overscanMultiplier: PAN_OVERSCAN_MULTIPLIER,
  });
  const baseContentX = marginWidth - renderStartOffset;

  const { getContentOffset, registerContentGroup, setContentOffset } =
    useContentTransform(baseContentX);

  const { isPanLocked, panDrag, unlockPan } = usePanController({
    svg,
    region,
    trackWidth,
    getContentOffset,
    setContentOffset,
    setRegion,
    onPanStart: () => undefined,
  });

  const handleDataSettled = useCallback(
    (key: string) => {
      settleData(key);
    },
    [settleData],
  );

  useLayoutEffect(() => {
    if (!isPanLocked || !isDataSettled) return;
    setContentOffset(0);
    unlockPan();
  }, [isDataSettled, isPanLocked, setContentOffset, unlockPan]);

  const { dataStates, isFetching } = useTrackData({
    useDataStore,
    registry,
    tracks,
    region: targetRenderRegion,
    onSettled: () => handleDataSettled(dataKey),
  });

  const isInteractionBlocked = isPanLocked || isFetching;
  const browserContextValue = useMemo(
    () => ({
      browserStore,
      trackStore,
      contextMenuStore,
      settingsStore: activeSettingsStore,
    }),
    [activeSettingsStore, browserStore, contextMenuStore, trackStore],
  );
  const interactionGateValue = useMemo(() => ({ isInteractionBlocked }), [isInteractionBlocked]);

  return (
    <BrowserProvider value={browserContextValue}>
      <InteractionGateProvider value={interactionGateValue}>
        <RegistryProvider registry={registry}>
          <BrowserSvgProvider svg={svg}>
            <TrackHeightProvider>
              <TooltipProvider
                isDisabled={panDrag.isDragging}
                getTooltipComponent={(type) =>
                  registry.get(type).tooltipComponent as AnyTrackTooltipComponent | undefined
                }
              >
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
                  <TooltipOverlay width={browserWidth} height={totalHeight} />
                  <InteractionShield
                    active={isInteractionBlocked}
                    width={browserWidth}
                    height={totalHeight}
                  />
                </SvgShell>
                <ContextMenuController />
                <SettingsModalController />
              </TooltipProvider>
            </TrackHeightProvider>
          </BrowserSvgProvider>
        </RegistryProvider>
      </InteractionGateProvider>
    </BrowserProvider>
  );
}
