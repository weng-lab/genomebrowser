import { memo, useCallback, useDebugValue, useEffect } from "react";
import { Track, useTrackIds, useTrackStore } from "../../store/trackStore";
import DisplayTrack from "../tracks/displayTrack";
import Modal from "../modal/modal";
import SVGWrapper from "./svgWrapper";
import useTrackData from "../../hooks/useTrackData";
import { IntitialBrowserState, useBrowserStore } from "../../store/browserStore";

function useTest() {
  useDebugValue("test");
  useTrackData();
}

export default function Browser({ tracks, state }: { tracks: Track[]; state: IntitialBrowserState }) {
  // Store functions
  const setTracks = useTrackStore((state) => state.setTracks);
  const initialize = useBrowserStore((state) => state.initialize);
  const getTrackIds = useTrackStore((state) => state.getTrackIds);

  // Initialize state
  useEffect(() => {
    initialize(state);
    setTracks(tracks);
  }, [tracks, setTracks, state, initialize]);

  useTest();

  const trackIds = useCallback(getTrackIds, [getTrackIds])();

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
      <SVGWrapper>
        {trackIds.map((id) => {
          return <DisplayTrack key={id} id={id} />;
        })}
      </SVGWrapper>
      <Modal />
    </div>
  );
}
