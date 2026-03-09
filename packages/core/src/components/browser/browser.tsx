import { useMemo } from "react";
import { builtInTrackDefinitions } from "../tracks/builtins";
import { TrackDefinition } from "../tracks/types";
import { BrowserStoreInstance } from "../../store/browserStore";
import { TrackStoreInstance } from "../../store/trackStore";
import { createDataStoreMemo, DataStoreInstance } from "../../store/dataStore";
import { createContextMenuStore } from "../../store/contextMenuStore";
import { createModalStore } from "../../store/modalStore";
import { createTooltipStore } from "../../store/tooltipStore";
import { createThemeStore } from "../../store/themeStore";
import { BrowserProvider, useBrowserStore, useTheme, useTrackStore } from "../../store/BrowserContext";
import { useDataFetcher } from "../../hooks/useDataFetcher";
import ContextMenu from "../contextMenu/contextMenu";
import Modal from "../modal/modal";
import Tooltip from "../tooltip/tooltip";
import Ruler from "../tracks/ruler/ruler";
import DragTrack from "../tracks/frame/DragTrack";
import Margin from "../tracks/frame/Margin";
import TrackFrame from "../tracks/frame/TrackFrame";
import SVGWrapper from "./svgWrapper";
import SelectRegion from "../tracks/ruler/selectRegion";
import Highlights from "../highlight/highlights";
import { RULER_HEIGHT } from "../tracks/ruler/ruler";
import { createTrackRegistry, getDefinition } from "../tracks/registry";

interface BrowserProps {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  externalDataStore?: DataStoreInstance;
  customTracks?: TrackDefinition[];
}

function BrowserContent() {
  const trackIds = useTrackStore((state) => state.ids);

  useDataFetcher();

  return (
    <>
      <SVGWrapper>
        <SelectRegion />
        <RulerFrame />
        <Highlights />
        {trackIds.map((id) => (
          <TrackFrame key={id} id={id} />
        ))}
        <Tooltip />
      </SVGWrapper>
      <ContextMenu />
      <Modal />
    </>
  );
}

function RulerFrame() {
  const background = useTheme((state) => state.background);
  const browserWidth = useBrowserStore((state) => state.browserWidth);
  const marginWidth = useBrowserStore((state) => state.marginWidth);

  return (
    <g id="ruler-frame">
      <DragTrack id="ruler">
        <g transform={`translate(${marginWidth},0)`}>
          <Ruler />
        </g>
      </DragTrack>
      <Margin
        id="ruler"
        height={RULER_HEIGHT}
        color={background}
        swapping={false}
        verticalMargin={0}
        onHover={() => {}}
        onLeave={() => {}}
      />
      <line stroke="#ccc" x1={0} x2={browserWidth} y1={RULER_HEIGHT} y2={RULER_HEIGHT} />
    </g>
  );
}

export default function Browser({ browserStore, trackStore, externalDataStore, customTracks = [] }: BrowserProps) {
  const dataStore = externalDataStore ?? createDataStoreMemo([]);
  const contextMenuStore = useMemo(() => createContextMenuStore(), []);
  const modalStore = useMemo(() => createModalStore(), []);
  const tooltipStore = useMemo(() => createTooltipStore(), []);
  const themeStore = useMemo(() => createThemeStore(), []);
  const trackDefinitions = useMemo(() => [...builtInTrackDefinitions, ...customTracks], [customTracks]);
  const trackRegistry = useMemo(() => createTrackRegistry(trackDefinitions), [trackDefinitions]);
  const getTrackDefinition = useMemo(() => (type: string) => getDefinition(trackRegistry, type), [trackRegistry]);

  const contextValue = useMemo(
    () => ({
      browserStore,
      trackStore,
      dataStore,
      contextMenuStore,
      modalStore,
      tooltipStore,
      themeStore,
      getTrackDefinition,
    }),
    [browserStore, trackStore, dataStore, contextMenuStore, modalStore, tooltipStore, themeStore, getTrackDefinition]
  );

  return (
    <BrowserProvider value={contextValue}>
      <BrowserContent />
    </BrowserProvider>
  );
}
