import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useTrackStore } from "./tracksStore";
import { useBrowserStore } from "./browserStore";
import { useTrackFetcher } from "./hooks/useTrackFetcher";

function Main() {
  const trackLength = useTrackStore((state) => state.getTrackLength());
  const totalHeight = useTrackStore((state) => state.getTotalHeight());
  const setTrackData = useTrackStore((state) => state.setTrackData);

  const { isLoading, error } = useTrackFetcher();
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  useEffect(() => {
    if (isLoading) {
      setTrackData(["LOADING", "LOADING", "LOADING", "LOADING", "LOADING", "LOADING", "LOADING"]);
    }
  }, [isLoading]);

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
      <svg viewBox={`0 0 1000 ${totalHeight}`} width="100%" height="100%">
        {Array.from({ length: trackLength }).map((_, index) => (
          <Track index={index} />
        ))}
      </svg>
    </div>
  );
}

function Track({ index }: { index: number }) {
  const track = useTrackStore((state) => state.getTrack(index));
  const prevHeights = useTrackStore((state) => state.getPrevHeights(index));
  const updateColor = useTrackStore((state) => state.updateColor);
  const setDomain = useBrowserStore((state) => state.setDomain);
  const color = useRef(track.color);
  return (
    <g
      onMouseEnter={() => updateColor(index, track.alt)}
      onMouseLeave={() => updateColor(index, color.current)}
      onClick={() => setDomain(track.data)}
      transform={`translate(0, ${prevHeights})`}
      key={index}
    >
      <rect x={0} y={0} width={1000} height={track.height} fill={track.color} />
      <text x={500} y={10} fontSize={10} fill="black">
        {track.data}
      </text>
    </g>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
