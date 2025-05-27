import { useEffect } from "react";
import LegacyDataFetcher from "../../api/legacy";
import { IntitialBrowserState, useBrowserStore } from "../../store/browserStore";
import { Track, useTrackStore } from "../../store/trackStore";
import ContextMenu from "../contextMenu/contextMenu";
import Modal from "../modal/modal";
import Tooltip from "../tooltip/tooltip";
import DisplayTrack from "../tracks/displayTrack";
import Ruler from "../tracks/ruler/ruler";
import Wrapper from "../tracks/wrapper/wrapper";
import SVGWrapper from "./svgWrapper";
import SelectRegion from "../tracks/ruler/selectRegion";
import Highlights from "../highlight/highlights";

export default function Browser({ tracks, state }: { tracks: Track[]; state: IntitialBrowserState }) {
  // Store functions
  const setTracks = useTrackStore((state) => state.setTracks);
  const initialize = useBrowserStore((state) => state.initialize);
  const trackIds = useTrackStore((state) => state.ids);

  // Initialize state
  useEffect(() => {
    initialize(state);
    setTracks(tracks);
  }, [tracks, setTracks, state, initialize]);

  return (
    <>
      <LegacyDataFetcher />
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
    </>
  );
}
