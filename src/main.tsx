import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track, TrackType, useTrackStore } from "./store/tracksStore";

function Main() {
  const tracks: Track[] = [
    { id: "1", title: "Track 1", titleSize: 12, data: [], range: { min: -.5, max: .5 }, height: 90, color: "#ffadad", trackType: TrackType.BigWig },
    { id: "2", title: "Track 2", titleSize: 12, data: [], range: { min: -.5, max: .5 }, height: 90, color: "#adffad", trackType: TrackType.BigWig },
    { id: "3", title: "Track 3", titleSize: 12, data: [], range: { min: -.5, max: .5 }, height: 90, color: "#adadff", trackType: TrackType.BigWig },

  ];

  return (
    <div>
      <Action />
      <Browser tracks={tracks} />
    </div>
  );
}

function Action(){
  const updateTrack = useTrackStore((state) => state.updateTrack);

  const onClick = () => {
    const min = Math.random() * -1;
    const max = Math.random();
    const height = Math.random() * 100 + 50;
    updateTrack("1", "range", { min, max });
    updateTrack("2", "height", height);
  }  

  return (
    <button onClick={onClick}>Click for action</button>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
