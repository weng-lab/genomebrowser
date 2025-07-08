import { useEffect } from "react";
import CleanDataFetcher from "../../api/cleanDataFetcher";
import { InitialBrowserState, useBrowserStore } from "../../store/browserStore";
import { Track, useTrackStore } from "../../store/trackStore";
import { useDataStore } from "../../store/dataStore";
import ContextMenu from "../contextMenu/contextMenu";
import Modal from "../modal/modal";
import Tooltip from "../tooltip/tooltip";
import DisplayTrack from "../tracks/displayTrack";
import Ruler from "../tracks/ruler/ruler";
import Wrapper from "../tracks/wrapper/wrapper";
import SVGWrapper from "./svgWrapper";
import SelectRegion from "../tracks/ruler/selectRegion";
import Highlights from "../highlight/highlights";

export default function Browser({ tracks, state }: { tracks: Track[]; state: InitialBrowserState }) {
  // Store functions
  const setTracks = useTrackStore((state) => state.setTracks);
  const initialize = useBrowserStore((state) => state.initialize);
  const trackIds = useTrackStore((state) => state.ids);
  const triggerFetch = useDataStore((state) => state.triggerFetch);

  // Initialize state and trigger fetch when tracks change
  useEffect(() => {
    initialize(state);
    setTracks(tracks);
    if (tracks.length > 0) {
      triggerFetch();
    }
  }, [tracks, setTracks, state, initialize, triggerFetch]);
  return (
    <div>
      <CleanDataFetcher />
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
    </div>
  );
}
