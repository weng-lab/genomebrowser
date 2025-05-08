import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track, TrackType, useTrackStore } from "./store/tracksStore";
import { useBrowserStore } from "./store/browserStore";

function Main() {
  const tracks: Track[] = [
    { id: "1", title: "Track 1", titleSize: 12, data: "", height: 90, color: "#ffadad", trackType: TrackType.BigWig },
    { id: "2", title: "Track 2", titleSize: 12, data: "", height: 50, color: "#ffd6a5", trackType: TrackType.BigWig },
    { id: "3", title: "Track 3", titleSize: 12, data: "", height: 75, color: "#fdffb6", trackType: TrackType.BigWig },
    { id: "4", title: "Track 4", titleSize: 12, data: "", height: 80, color: "#caffbf", trackType: TrackType.BigWig },
    { id: "5", title: "Track 5", titleSize: 12, data: "", height: 60, color: "#9bf6ff", trackType: TrackType.BigWig },
    { id: "6", title: "Track 6", titleSize: 12, data: "", height: 40, color: "#a0c4ff", trackType: TrackType.BigWig },
    { id: "7", title: "Track 7", titleSize: 12, data: "", height: 45, color: "#bdb2ff", trackType: TrackType.BigWig },
  ];

  // Domain change
  const setDomain = useBrowserStore((state) => state.setDomain);
  const setLoading = useTrackStore((state) => state.setLoading);

  const changeDomain = () => {
    setLoading();
    setDomain(Math.random().toString(36).substring(7));
  };

  return (
    <div>
      <button onClick={changeDomain}>Change Domain</button>
      <Browser tracks={tracks} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
