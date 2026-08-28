import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { createDataStore } from "./data/dataStore";
import { useTrackData } from "./data/useTrackData";
import { createTrackResourceStore } from "./data/trackResourceStore";
import type { TrackResourceStoreInstance } from "./data/trackResourceStore";
import type { DataStoreInstance } from "./data/types";
import { TooltipOverlay } from "./tooltip/TooltipOverlay";
import { TooltipProvider } from "./tooltip/TooltipProvider";
import { BrowserSvgProvider } from "./svg/BrowserSvgContext";
import { TrackHeightProvider } from "./track-row/TrackHeightProvider";
import { createSettingsStore, type SettingsStoreInstance } from "./state/settingsStore";
import { BrowserProvider, InteractionGateProvider } from "./state/BrowserContext";
import type { BrowserStore, BrowserStoreInstance } from "./state/browserStore";
import { useTrackMutationGate } from "./state/browserContextState";
import { createContextMenuStore } from "./state/contextMenuStore";
import type { TrackStoreInstance } from "./state/trackStore";
import { InteractionShield } from "./overlays/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { RegistryProvider } from "./state/RegistryContext";
import { SvgShell } from "./svg/SvgShell";
import {
  createTrackLayouts,
  getTrackWrapperHeight,
  type TrackLayout,
} from "./track-row/trackLayout";
import { TrackStack } from "./track-row/TrackStack";
import type { AnyTrackTooltipComponent } from "../modules/types";
import { RULER_HEIGHT, Ruler } from "./viewport/Ruler";
import { SelectRegion } from "./viewport/SelectRegion";
import { useContentTransform } from "./viewport/useContentTransform";
import { usePanController } from "./viewport/usePanController";
import { useRenderWindow } from "./viewport/useRenderWindow";
import type { GenomicRegion } from "../genome/region";
import type { PanDragHandlers } from "./viewport/usePanDrag";

const PAN_OVERSCAN_MULTIPLIER = 3;

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  settingsStore?: SettingsStoreInstance;
};

export function GenomeBrowser({ browserStore, trackStore, settingsStore }: GenomeBrowserProps) {
  const useBrowserStore = browserStore;
  const useTrackStore = trackStore;
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  const region = useBrowserStore((state) => state.region);
  const assembly = useBrowserStore((state) => state.assembly);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const trackWidth = useBrowserStore((state) => state.trackWidth);
  const titleSize = useBrowserStore((state) => state.titleSize);
  const setRegion = useBrowserStore((state) => state.setRegion);

  const trackIds = useTrackStore((state) => state.order);
  const wrapperHeights = useTrackStore(
    useShallow((state) => state.tracks.map((track) => getTrackWrapperHeight(track, titleSize))),
  );
  const registry = useTrackStore((state) => state.registry);

  const useDataStore = useMemo(() => createDataStore(), []);
  const contextMenuStore = useMemo(() => createContextMenuStore(), []);
  const internalSettingsStore = useMemo(() => createSettingsStore(), []);
  // One resource store per mount gives each browser instance a private set of
  // track-scoped fetcher resources; unmounting releases them (in useTrackData).
  const resourceStore = useMemo(() => createTrackResourceStore(), []);

  const activeSettingsStore = settingsStore ?? internalSettingsStore;
  const browserWidth = marginWidth + trackWidth;
  const trackLayouts = useMemo(
    () => createTrackLayouts(trackIds, wrapperHeights, RULER_HEIGHT),
    [trackIds, wrapperHeights],
  );
  const totalHeight = RULER_HEIGHT + wrapperHeights.reduce((total, height) => total + height, 0);

  const {
    dataKey,
    displayedRenderRegion,
    isDataSettled,
    renderStartOffset,
    renderWidth,
    settleData,
    targetRenderRegion,
    targetRenderWidth,
  } = useRenderWindow({
    assembly,
    region,
    trackIds,
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

  const browserContextValue = useMemo(
    () => ({
      browserStore,
      trackStore,
      contextMenuStore,
      settingsStore: activeSettingsStore,
    }),
    [activeSettingsStore, browserStore, contextMenuStore, trackStore],
  );

  return (
    <BrowserProvider value={browserContextValue}>
      <RegistryProvider registry={registry}>
        <BrowserSvgProvider svg={svg}>
          <TrackHeightProvider>
            <TooltipProvider
              isDisabled={panDrag.isDragging}
              getTooltipComponent={(type) =>
                registry.get(type).tooltipComponent as AnyTrackTooltipComponent | undefined
              }
            >
              <TrackDataCoordinator
                useTrackStore={useTrackStore}
                useDataStore={useDataStore}
                resourceStore={resourceStore}
                assembly={assembly}
                region={targetRenderRegion}
                width={targetRenderWidth}
                onSettled={() => handleDataSettled(dataKey)}
                isPanLocked={isPanLocked}
              >
                <BrowserView
                  useTrackStore={useTrackStore}
                  useDataStore={useDataStore}
                  svg={svg}
                  setSvg={setSvg}
                  browserWidth={browserWidth}
                  totalHeight={totalHeight}
                  marginWidth={marginWidth}
                  trackWidth={trackWidth}
                  region={region}
                  setRegion={setRegion}
                  displayedRenderRegion={displayedRenderRegion}
                  baseContentX={baseContentX}
                  renderWidth={renderWidth}
                  registerContentGroup={registerContentGroup}
                  panDrag={panDrag}
                  titleSize={titleSize}
                  trackLayouts={trackLayouts}
                />
              </TrackDataCoordinator>
            </TooltipProvider>
          </TrackHeightProvider>
        </BrowserSvgProvider>
      </RegistryProvider>
    </BrowserProvider>
  );
}

function TrackDataCoordinator({
  useTrackStore,
  useDataStore,
  resourceStore,
  assembly,
  region,
  width,
  onSettled,
  isPanLocked,
  children,
}: {
  useTrackStore: TrackStoreInstance;
  useDataStore: DataStoreInstance;
  resourceStore: TrackResourceStoreInstance;
  assembly: BrowserStore["assembly"];
  region: GenomicRegion;
  width: number;
  onSettled: () => void;
  isPanLocked: boolean;
  children: ReactNode;
}) {
  const { isFetching } = useTrackData({
    useDataStore,
    useTrackStore,
    resourceStore,
    assembly,
    region,
    width,
    onSettled,
  });
  const isInteractionBlocked = isPanLocked || isFetching;
  const interactionGateValue = useMemo(() => ({ isInteractionBlocked }), [isInteractionBlocked]);

  return <InteractionGateProvider value={interactionGateValue}>{children}</InteractionGateProvider>;
}

function BrowserView({
  useTrackStore,
  useDataStore,
  svg,
  setSvg,
  browserWidth,
  totalHeight,
  marginWidth,
  trackWidth,
  region,
  setRegion,
  displayedRenderRegion,
  baseContentX,
  renderWidth,
  registerContentGroup,
  panDrag,
  titleSize,
  trackLayouts,
}: {
  useTrackStore: TrackStoreInstance;
  useDataStore: DataStoreInstance;
  svg: SVGSVGElement | null;
  setSvg: Dispatch<SetStateAction<SVGSVGElement | null>>;
  browserWidth: number;
  totalHeight: number;
  marginWidth: number;
  trackWidth: number;
  region: GenomicRegion;
  setRegion: BrowserStore["setRegion"];
  displayedRenderRegion: GenomicRegion;
  baseContentX: number;
  renderWidth: number;
  registerContentGroup: (node: SVGGElement) => () => void;
  panDrag: PanDragHandlers;
  titleSize: number;
  trackLayouts: TrackLayout[];
}) {
  const { isInteractionBlocked } = useTrackMutationGate();

  return (
    <>
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
              trackStore={useTrackStore}
              useDataStore={useDataStore}
              trackLayouts={trackLayouts}
              visibleRegion={region}
              region={displayedRenderRegion}
              marginWidth={marginWidth}
              trackWidth={trackWidth}
              contentX={baseContentX}
              contentWidth={renderWidth}
              registerContentGroup={registerContentGroup}
              panDrag={panDrag}
              isPanLocked={isInteractionBlocked}
              titleSize={titleSize}
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
    </>
  );
}
