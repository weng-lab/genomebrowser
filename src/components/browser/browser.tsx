import { useEffect } from "react";
import { IntitialBrowserState, useBrowserStore } from "../../store/browserStore";
import { Track, useTrackStore } from "../../store/trackStore";
import Modal from "../modal/modal";
import DisplayTrack from "../tracks/displayTrack";
import SVGWrapper from "./svgWrapper";
import ContextMenu from "../contextMenu/contextMenu";
import LegacyDataFetcher from "../../api/legacy";
import Ruler from "../tracks/ruler/ruler";
import Wrapper from "../tracks/wrapper/wrapper";

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
      {/* <TrackDataFetcher /> */}
      <LegacyDataFetcher />
      <SVGWrapper>
        <Wrapper id="ruler" transform="translate(0, 0)" loading={false} error={undefined}>
          <Ruler />
        </Wrapper>
        {trackIds.map((id) => {
          return <DisplayTrack key={id} id={id} />;
        })}
      </SVGWrapper>
      <Modal />
      <ContextMenu />
    </>
  );
}
