import { useEffect } from "react";
import { Track, useTrackStore } from "../../store/trackStore";
import DisplayTrack from "../tracks/displayTrack";
import Modal from "../modal/modal";
import SVGWrapper from "./svgWrapper";
import useTrackData from "../../hooks/useTrackData";
import { IntitialBrowserState, useBrowserStore } from "../../store/browserStore";

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
      <TrackData />
      <SVGWrapper>
        {trackIds.map((id) => {
          return <DisplayTrack key={id} id={id} />;
        })}
      </SVGWrapper>
      <Modal />
    </div>
  );
}

function TrackData() {
  useTrackData();
  return null;
}
