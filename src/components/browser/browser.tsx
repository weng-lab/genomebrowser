import { useEffect } from "react";
import { useTrackFetcher } from "../../hooks/useTrackFetcher";
import { Track, useTrackStore } from "../../store/tracksStore";
import DisplayTrack from "../tracks/displayTrack";
import Modal from "../modal/modal";
import SVGWrapper from "./svgWrapper";

export default function Browser({ tracks }: { tracks: Track[] }) {
  // Store functions
  const setTracks = useTrackStore((state) => state.setTracks);
  const trackLength = useTrackStore((state) => state.getTrackLength());
  const setLoading = useTrackStore((state) => state.setLoading);

  // Initialize state
  useEffect(() => {
    setTracks(tracks);
    setLoading();
  }, [tracks]);

  // Track fetcher
  const { error, refetch } = useTrackFetcher();
  useEffect(() => {
    refetch();
  }, []);

  // Error handling
  if (error) {
    return <div>Error: {error.message}</div>;
  }

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
        {Array.from({ length: trackLength }).map((_, index) => (
          <DisplayTrack key={index} index={index} />
        ))}
      </SVGWrapper>
      <Modal />
    </div>
  );
}
