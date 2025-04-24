import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useBrowserStore } from "./browserStore";
import DragTrack from "./dragTrack";
import { useTrackFetcher } from "./hooks/useTrackFetcher";
import SVGWrapper from "./svgWrapper";
import { useTrackStore } from "./tracksStore";
import Margin from "./margin";
import { Track } from "./tracksStore";
import useBrowserScale from "./useBrowserScale";
import SwapTrack from "./swapTrack";

function Main() {
  const trackLength = useTrackStore((state) => state.getTrackLength());
  const setTrackData = useTrackStore((state) => state.setTrackData);

  const { loading, error, refetch, setLoading } = useTrackFetcher();
  useEffect(() => {
    refetch();
  }, []);

  if (error) {
    return <div>Error: {error.message}</div>;
  }
  useEffect(() => {
    if (loading) {
      setTrackData(["LOADING", "LOADING", "LOADING", "LOADING", "LOADING", "LOADING", "LOADING"]);
    }
  }, [loading]);

  const setDomain = useBrowserStore((state) => state.setDomain);
  const changeDomain = () => {
    setLoading(true);
    setDomain(Math.random().toString(36).substring(7));
  };

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
      <button onClick={() => changeDomain()}>Change Domain</button>
      <SVGWrapper>
        {Array.from({ length: trackLength }).map((_, index) => (
          <DisplayTrack key={index} index={index} />
        ))}
      </SVGWrapper>
    </div>
  );
}

function DisplayTrack({ index }: { index: number }) {
  const track = useTrackStore((state) => state.getTrack(index));
  const prevHeights = useTrackStore((state) => state.getPrevHeights(index));
  const transform = `translate(0, ${prevHeights})`;

  return (
    <Wrapper height={track.height} color={track.color} transform={transform}>
      <DataTrack index={index} track={track} transform={transform} />
    </Wrapper>
  );
}

function DataTrack({ index, track, transform }: { index: number; track: Track; transform: string }) {
  const updateColor = useTrackStore((state) => state.updateColor);
  const updateHeight = useTrackStore((state) => state.updateHeight);
  const color = useRef(track.color);
  const [alt, setAlt] = useState(false);
  const handleClick = () => {
    setAlt(!alt);
    updateHeight(index, 100);
  };

  useEffect(() => {
    updateColor(index, alt ? track.alt : color.current);
  }, [alt]);

  return (
    <g onClick={() => handleClick()} transform={transform} key={index}>
      <rect x={0} y={0} width={1000} height={track.height} fill={track.color} />
      <text x={500} y={10} fontSize={10} fill="black">
        {track.data}
      </text>
    </g>
  );
}

function Wrapper({ children, height, transform, color }: { children: React.ReactNode; height: number; transform: string; color: string }) {
  return (
    <SwapTrack>
      <DragTrack>{children}</DragTrack>
      <Margin height={height} color={color} transform={transform} />
    </SwapTrack>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
