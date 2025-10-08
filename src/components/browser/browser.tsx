import { useMemo } from "react";
import DataFetcher from "../../api/DataFetcher";
import { BrowserStoreInstance } from "../../store/browserStore";
import { TrackStoreInstance } from "../../store/trackStore";
import { createDataStore, DataStoreInstance } from "../../store/dataStore";
import { createContextMenuStore } from "../../store/contextMenuStore";
import { createModalStore } from "../../store/modalStore";
import { createTooltipStore } from "../../store/tooltipStore";
import { createThemeStore } from "../../store/themeStore";
import { BrowserProvider } from "../../store/BrowserContext";
import ContextMenu from "../contextMenu/contextMenu";
import Modal from "../modal/modal";
import Tooltip from "../tooltip/tooltip";
import DisplayTrack from "../tracks/displayTrack";
import Ruler from "../tracks/ruler/ruler";
import Wrapper from "../tracks/wrapper/wrapper";
import SVGWrapper from "./svgWrapper";
import SelectRegion from "../tracks/ruler/selectRegion";
import Highlights from "../highlight/highlights";

interface BrowserProps {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  externalDataStore?: DataStoreInstance;
}

export default function Browser({ browserStore, trackStore, externalDataStore }: BrowserProps) {
  // Create internal stores for this browser instance
  const dataStore = externalDataStore ?? createDataStore([]);
  const contextMenuStore = useMemo(() => createContextMenuStore(), []);
  const modalStore = useMemo(() => createModalStore(), []);
  const tooltipStore = useMemo(() => createTooltipStore(), []);
  const themeStore = useMemo(() => createThemeStore(), []);

  // Create context value
  const contextValue = useMemo(
    () => ({
      browserStore,
      trackStore,
      dataStore,
      contextMenuStore,
      modalStore,
      tooltipStore,
      themeStore,
    }),
    [browserStore, trackStore, dataStore, contextMenuStore, modalStore, tooltipStore, themeStore]
  );

  const trackIds = trackStore((state) => state.ids);

  return (
    <BrowserProvider value={contextValue}>
      <DataFetcher />
      <SVGWrapper>
        <SelectRegion />
        <Wrapper id="ruler" transform="translate(0, 0)" loading={false} error={undefined}>
          <Ruler />
        </Wrapper>
        {trackIds.map((id) => {
          return <DisplayTrack key={id} id={id} />;
        })}
        <Highlights />
        <Tooltip />
      </SVGWrapper>
      <ContextMenu />
      <Modal />
    </BrowserProvider>
  );
}
