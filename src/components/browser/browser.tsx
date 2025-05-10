import { useEffect, useMemo } from "react";
import { Track, useTrackStore } from "../../store/trackStore";
import DisplayTrack from "../tracks/displayTrack";
import Modal from "../modal/modal";
import SVGWrapper from "./svgWrapper";
import useTrackData from "../../hooks/useTrackData";
import { useBrowserStore } from "../../store/browserStore";

export default function Browser({ tracks }: { tracks: Track[] }) {
  // Store functions
  const setTracks = useTrackStore((state) => state.setTracks);
  const initialize = useBrowserStore((state) => state.initialize);
  const getTrackIds = useTrackStore((state) => state.getTrackIds);

  // Initialize state
  useEffect(() => {
    initialize({
      domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
      marginWidth: 150,
      trackWidth: 1350,
    });
    setTracks(tracks);
  }, [tracks, initialize, setTracks]);

  useTrackData();

  const trackIds = getTrackIds();

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
