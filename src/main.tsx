import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track, useTrackStore } from "./store/tracksStore";
import { useBrowserStore } from "./store/browserStore";

function Main() {
  const tracks = [
    { id: "1", title: "Track 1", titleSize: 12, data: "", height: 90, color: "#ffadad", alt: "#ff9494" },
    { id: "2", title: "Track 2", titleSize: 12, data: "", height: 50, color: "#ffd6a5", alt: "#ffc78c" },
    { id: "3", title: "Track 3", titleSize: 12, data: "", height: 75, color: "#fdffb6", alt: "#f4f68d" },
    { id: "4", title: "Track 4", titleSize: 12, data: "", height: 80, color: "#caffbf", alt: "#b1ffa6" },
    { id: "5", title: "Track 5", titleSize: 12, data: "", height: 60, color: "#9bf6ff", alt: "#82dde6" },
    { id: "6", title: "Track 6", titleSize: 12, data: "", height: 40, color: "#a0c4ff", alt: "#87abf6" },
    { id: "7", title: "Track 7", titleSize: 12, data: "", height: 45, color: "#bdb2ff", alt: "#a499f6" },
  ] as Track[];

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
