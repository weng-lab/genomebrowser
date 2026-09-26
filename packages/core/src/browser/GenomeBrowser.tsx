import {
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  createTrackDataController,
  PAN_OVERSCAN_MULTIPLIER,
  type TrackDataController,
} from "./data/trackDataController";
import { TooltipOverlay } from "./tooltip/TooltipOverlay";
import { BrowserSvgProvider } from "./svg/BrowserSvgContext";
import { BrowserProvider } from "./state/BrowserContext";
import type { BrowserStore, BrowserStoreInstance } from "./state/browserStore";
import {
  createBrowserContextValue,
  useGenomeBrowser,
  useIsInteractionBlocked,
} from "./state/browserContextState";
import type { TrackStoreInstance } from "./state/trackStore";
import { InteractionShield } from "./overlays/InteractionShield";
import { Highlights } from "./overlays/Highlights";
import { ContextMenuController } from "./overlays/ContextMenuController";
import { SettingsModalController } from "./overlays/SettingsModalController";
import { SvgShell } from "./svg/SvgShell";
import {
  createTrackLayouts,
  getTrackWrapperHeight,
  type TrackLayout,
} from "./track-row/trackLayout";
import { TrackStack } from "./track-row/TrackStack";
import { SelectRegion } from "./viewport/SelectRegion";
import { getContentPlacement, getRenderWindow } from "./viewport/renderWindow";
import { useContentTransform, type RegisterContentGroup } from "./viewport/useContentTransform";
import { usePanController } from "./viewport/usePanController";
import { usePanWheel } from "./viewport/usePanWheel";
import type { GenomicRegion } from "../genome/region";
import type { PanDragHandlers } from "./viewport/usePanDrag";
import { useContainerWidth } from "./viewport/useContainerWidth";

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
  const marginWidth = useBrowserStore((state) => state.marginWidth);
  const titleSize = useBrowserStore((state) => state.titleSize);
  const setRegion = useBrowserStore((state) => state.setRegion);

  const trackIds = useTrackStore((state) => state.order);
  const wrapperHeights = useTrackStore(
    useShallow((state) => state.tracks.map((track) => getTrackWrapperHeight(track, titleSize))),
  );

  // One controller per mount gives each browser instance private track data
  // and fetcher resources. It follows the stores itself once connected.
  const [dataController] = useState(() =>
    createTrackDataController({ browserStore, trackStore, trackWidth }),
  );
  useLayoutEffect(() => dataController.connect(), [dataController]);
  useLayoutEffect(() => dataController.setTrackWidth(trackWidth), [dataController, trackWidth]);

  const browserWidth = marginWidth + trackWidth;
  const trackLayouts = useMemo(
    () => createTrackLayouts(trackIds, wrapperHeights, 0),
    [trackIds, wrapperHeights],
  );
  const totalHeight = Math.max(
    1,
    wrapperHeights.reduce((total, height) => total + height, 0),
  );

  const { getContentOffset, registerContentGroup, setContentOffset } = useContentTransform({
    region,
    marginWidth,
    trackWidth,
  });

  const { commitPan, panDrag } = usePanController({
    svg,
    region,
    trackWidth,
    getContentOffset,
    setContentOffset,
    setRegion,
  });

  // The value never changes after mount, so components subscribe to changing
  // state through store selectors.
  const [browserContextValue] = useState(() =>
    createBrowserContextValue(browserStore, trackStore, panDrag.isDragging),
  );

  return (
    <BrowserProvider value={browserContextValue}>
      <BrowserSvgProvider svg={svg}>
        <BrowserView
          dataController={dataController}
          svg={svg}
          setSvg={setSvg}
          browserWidth={browserWidth}
          scale={scale}
          totalHeight={totalHeight}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          region={region}
          setRegion={setRegion}
          registerContentGroup={registerContentGroup}
          onPanCommit={commitPan}
          setContentOffset={setContentOffset}
          panDrag={panDrag}
          titleSize={titleSize}
          trackLayouts={trackLayouts}
        />
      </BrowserSvgProvider>
    </BrowserProvider>
  );
}

function BrowserView({
  dataController,
  svg,
  setSvg,
  browserWidth,
  scale,
  totalHeight,
  marginWidth,
  trackWidth,
  region,
  setRegion,
  registerContentGroup,
  panDrag,
  onPanCommit,
  setContentOffset,
  titleSize,
  trackLayouts,
}: {
  dataController: TrackDataController;
  svg: SVGSVGElement | null;
  setSvg: Dispatch<SetStateAction<SVGSVGElement | null>>;
  browserWidth: number;
  scale: number;
  totalHeight: number;
  marginWidth: number;
  trackWidth: number;
  region: GenomicRegion;
  setRegion: BrowserStore["setRegion"];
  registerContentGroup: RegisterContentGroup;
  panDrag: PanDragHandlers;
  onPanCommit: (deltaPx: number) => void;
  setContentOffset: (deltaPx: number) => number;
  titleSize: number;
  trackLayouts: TrackLayout[];
}) {
  const { useBrowserStore } = useGenomeBrowser();
  const assembly = useBrowserStore((state) => state.assembly);
  // Highlights cover the same pre-loaded window the tracks fetch, so a drag
  // slides them into view along with the data.
  const highlightRegion = useMemo(
    () =>
      getRenderWindow(region, assembly, trackWidth, PAN_OVERSCAN_MULTIPLIER)?.targetRenderRegion ??
      region,
    [assembly, region, trackWidth],
  );
  const highlightPlacement = getContentPlacement(highlightRegion, region, trackWidth, marginWidth);

  return (
    <>
      <SvgShell width={browserWidth} height={totalHeight} scale={scale} setSvg={setSvg}>
        <PanWheel
          svg={svg}
          trackWidth={trackWidth}
          panDrag={panDrag}
          setContentOffset={setContentOffset}
          onCommit={onPanCommit}
        />
        <GatedSelectRegion
          svg={svg}
          marginWidth={marginWidth}
          trackWidth={trackWidth}
          totalHeight={totalHeight}
          region={region}
          setRegion={setRegion}
        >
          <Highlights
            type="filled"
            region={highlightRegion}
            marginWidth={marginWidth}
            renderWidth={highlightPlacement.width}
            contentX={highlightPlacement.x}
            browserWidth={browserWidth}
            totalHeight={totalHeight}
            registerContentGroup={registerContentGroup}
          />
          <g>
            <TrackStack
              dataController={dataController}
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
            region={highlightRegion}
            marginWidth={marginWidth}
            renderWidth={highlightPlacement.width}
            contentX={highlightPlacement.x}
            browserWidth={browserWidth}
            totalHeight={totalHeight}
            registerContentGroup={registerContentGroup}
          />
        </GatedSelectRegion>
        <TooltipOverlay width={browserWidth} height={totalHeight} />
        <GatedInteractionShield width={browserWidth} height={totalHeight} />
      </SvgShell>
      <ContextMenuController />
      <SettingsModalController />
    </>
  );
}

// The components below read the interaction gate themselves, so a change in
// loading state renders them without re-rendering the track rows.

function PanWheel({
  svg,
  trackWidth,
  panDrag,
  setContentOffset,
  onCommit,
}: {
  svg: SVGSVGElement | null;
  trackWidth: number;
  panDrag: PanDragHandlers;
  setContentOffset: (deltaPx: number) => number;
  onCommit: (deltaPx: number) => void;
}) {
  const isInteractionBlocked = useIsInteractionBlocked();
  const { useBrowserStore } = useGenomeBrowser();
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  usePanWheel({
    svg,
    disabled: isInteractionBlocked || selectionMode !== "pan",
    trackWidth,
    isDragging: panDrag.isDragging,
    setContentOffset,
    onCommit,
  });
  return null;
}

function GatedSelectRegion({
  svg,
  marginWidth,
  trackWidth,
  totalHeight,
  region,
  setRegion,
  children,
}: {
  svg: SVGSVGElement | null;
  marginWidth: number;
  trackWidth: number;
  totalHeight: number;
  region: GenomicRegion;
  setRegion: BrowserStore["setRegion"];
  children: ReactNode;
}) {
  const isInteractionBlocked = useIsInteractionBlocked();
  const { useBrowserStore } = useGenomeBrowser();
  const selectionMode = useBrowserStore((state) => state.selectionMode);
  const setSelectionMode = useBrowserStore((state) => state.setSelectionMode);
  const selectionHighlight = useBrowserStore((state) => state.selectionHighlight);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const highlights = useBrowserStore((state) => state.highlights);

  return (
    <SelectRegion
      svg={svg}
      marginWidth={marginWidth}
      trackWidth={trackWidth}
      totalHeight={totalHeight}
      region={region}
      setRegion={setRegion}
      disabled={isInteractionBlocked}
      mode={selectionMode}
      onModeChange={setSelectionMode}
      highlightStyle={selectionHighlight}
      onHighlight={addHighlight}
      highlights={highlights}
    >
      {children}
    </SelectRegion>
  );
}

function GatedInteractionShield({ width, height }: { width: number; height: number }) {
  const isInteractionBlocked = useIsInteractionBlocked();
  return <InteractionShield active={isInteractionBlocked} width={width} height={height} />;
}
