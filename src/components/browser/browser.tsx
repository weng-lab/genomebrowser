import { useEffect } from "react";
import TrackDataFetcher from "./trackDataFetcher";
import { IntitialBrowserState, useBrowserStore } from "../../store/browserStore";
import { Track, useTrackStore } from "../../store/trackStore";
import Modal from "../modal/modal";
import DisplayTrack from "../tracks/displayTrack";
import SVGWrapper from "./svgWrapper";
import ContextMenu from "../contextMenu/contextMenul";
import LegacyDataFetcher from "../../api/legacy";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "auto",
      }}
    >
      {/* <TrackDataFetcher /> */}
      <LegacyDataFetcher />
      <SVGWrapper>
        {trackIds.map((id) => {
          return <DisplayTrack key={id} id={id} />;
        })}
      </SVGWrapper>
      <Modal />
      <ContextMenu />
    </div>
  );
}
