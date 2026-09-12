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
import { createSettingsStore } from "./state/settingsStore";
import { BrowserProvider, InteractionGateProvider } from "./state/BrowserContext";
import type { BrowserStore, BrowserStoreInstance } from "./state/browserStore";
import { useBrowserStore, useTrackMutationGate } from "./state/browserContextState";
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
import { SelectRegion } from "./viewport/SelectRegion";
import { useContentTransform } from "./viewport/useContentTransform";
import { usePanController } from "./viewport/usePanController";
import { usePanWheel } from "./viewport/usePanWheel";
import { useRenderWindow } from "./viewport/useRenderWindow";
import type { GenomicRegion } from "../genome/region";
import type { PanDragHandlers } from "./viewport/usePanDrag";
import { useContainerWidth } from "./viewport/useContainerWidth";

const PAN_OVERSCAN_MULTIPLIER = 3;

export type GenomeBrowserProps = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  /** Follow the container by default, or use the store's configured track width. */
  sizing?: "responsive" | "fixed";
  /** Magnification of the entire SVG. Must be finite and positive. */
  scale?: number;
};

export function GenomeBrowser({
  browserStore,
  trackStore,
  sizing = "responsive",
  scale = 1,
}: GenomeBrowserProps) {
  const useBrowserStore = browserStore;
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const configuredTrackWidth = useBrowserStore((state) => state.trackWidth);
  const { containerRef, width } = useContainerWidth(sizing === "responsive");

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("GenomeBrowser scale must be a finite positive number.");
  }

  const trackWidth =
    sizing === "fixed"
      ? configuredTrackWidth
      : width === null
        ? null
        : Math.max(1, width / scale - marginWidth);

  return (
    <div
      ref={containerRef}
      style={{
        width: sizing === "fixed" ? (marginWidth + configuredTrackWidth) * scale + 2 : "100%",
        maxWidth: "100%",
        minWidth: 0,
        padding: 0,
        boxSizing: "border-box",
        border: "1px solid #ccc",
        overflowX: "auto",
      }}
    >
      {trackWidth !== null && (
        <GenomeBrowserRuntime
          browserStore={browserStore}
          trackStore={trackStore}
          trackWidth={trackWidth}
          scale={scale}
        />
      )}
    </div>
  );
}

function GenomeBrowserRuntime({
  browserStore,
  trackStore,
  trackWidth,
  scale,
}: GenomeBrowserProps & { trackWidth: number; scale: number }) {
  const useBrowserStore = browserStore;
  const useTrackStore = trackStore;
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  const region = useBrowserStore((state) => state.region);
  const assembly = useBrowserStore((state) => state.assembly);
  const marginWidth = useBrowserStore((state) => state.marginWidth);
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

  const browserWidth = marginWidth + trackWidth;
  const trackLayouts = useMemo(
    () => createTrackLayouts(trackIds, wrapperHeights, 0),
    [trackIds, wrapperHeights],
  );
  const totalHeight = Math.max(
    1,
    wrapperHeights.reduce((total, height) => total + height, 0),
  );

  const {
    dataKey,
    displayedRenderRegion,
    isDataSettled,
    renderStartOffset,
    renderWidth,
    settleData,
    targetRenderRegion,
    targetRenderWidth,
    isDisplayDataCompatible,
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

  const { isPanLocked, commitPan, panDrag, unlockPan } = usePanController({
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
      settingsStore: internalSettingsStore,
    }),
    [internalSettingsStore, browserStore, contextMenuStore, trackStore],
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
                  isDisplayDataCompatible={isDisplayDataCompatible}
                  useTrackStore={useTrackStore}
                  useDataStore={useDataStore}
                  svg={svg}
                  setSvg={setSvg}
                  browserWidth={browserWidth}
                  scale={scale}
                  totalHeight={totalHeight}
                  marginWidth={marginWidth}
                  trackWidth={trackWidth}
                  region={region}
                  setRegion={setRegion}
                  displayedRenderRegion={displayedRenderRegion}
                  baseContentX={baseContentX}
                  renderWidth={renderWidth}
                  registerContentGroup={registerContentGroup}
                  onPanCommit={commitPan}
                  setContentOffset={setContentOffset}
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
  isDisplayDataCompatible,
  useTrackStore,
  useDataStore,
  svg,
  setSvg,
  browserWidth,
  scale,
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
  onPanCommit,
  setContentOffset,
  titleSize,
  trackLayouts,
}: {
  isDisplayDataCompatible: boolean;
  useTrackStore: TrackStoreInstance;
  useDataStore: DataStoreInstance;
  svg: SVGSVGElement | null;
  setSvg: Dispatch<SetStateAction<SVGSVGElement | null>>;
  browserWidth: number;
  scale: number;
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
  onPanCommit: (deltaPx: number) => void;
  setContentOffset: (deltaPx: number) => void;
  titleSize: number;
  trackLayouts: TrackLayout[];
}) {
  const { isInteractionBlocked } = useTrackMutationGate();
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  const selectionHighlight = useBrowserStore((state) => state.selectionHighlight);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const highlights = useBrowserStore((state) => state.highlights);

  usePanWheel({
    svg,
    disabled: isInteractionBlocked || selectionMode !== "pan",
    trackWidth,
    isDragging: panDrag.isDragging,
    setContentOffset,
    onCommit: onPanCommit,
  });

  return (
    <>
      <SvgShell width={browserWidth} height={totalHeight} scale={scale} setSvg={setSvg}>
        <SelectRegion
          svg={svg}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          totalHeight={totalHeight}
          region={region}
          setRegion={setRegion}
          disabled={isInteractionBlocked}
          mode={selectionMode}
          highlightStyle={selectionHighlight}
          onHighlight={addHighlight}
          highlights={highlights}
        >
          <Highlights
            type="filled"
            region={displayedRenderRegion}
            marginWidth={marginWidth}
            renderWidth={renderWidth}
            contentX={baseContentX}
            browserWidth={browserWidth}
            totalHeight={totalHeight}
            registerContentGroup={registerContentGroup}
          />
          <g>
            <TrackStack
              isDisplayDataCompatible={isDisplayDataCompatible}
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
            type="outlined"
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
