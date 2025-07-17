import { createRoot } from "react-dom/client";
import {
  Browser,
  createBrowserStore,
  createTrackStore,
  Track,
  InitialBrowserState,
  TrackType,
  DisplayMode,
  Vibrant,
} from "./lib";
import { StrictMode } from "react";

// Example tracks for testing
const tracks1: Track[] = [
  {
    id: "1",
    title: "bigWig",
    titleSize: 12,
    height: 100,
    color: Vibrant[6],
    trackType: TrackType.BigWig,
    displayMode: DisplayMode.Full,
    url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
  }
];

const tracks2: Track[] = [
  {
    id: "2",
    title: "bigBed",
    titleSize: 12,
    height: 20,
    color: Vibrant[7],
    trackType: TrackType.BigBed,
    displayMode: DisplayMode.Dense,
    url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  },
];

const initialBrowserState: InitialBrowserState = {
  domain: { chromosome: "chr12", start: 53380037 - 20000, end: 53380206 + 20000 },
  marginWidth: 100,
  trackWidth: 1400,
  multiplier: 3,
};

// Example usage: Multiple independent browsers
export function IndependentBrowsers() {
  const browserStore1 = createBrowserStore(initialBrowserState);
  const trackStore1 = createTrackStore(tracks1);

  const browserStore2 = createBrowserStore(initialBrowserState);
  const trackStore2 = createTrackStore(tracks2);

  return (
    <div>
      <h2>Independent Browsers</h2>
      <div style={{ border: "1px solid #ccc", margin: "10px" }}>
        <h3>Browser 1</h3>
        <Browser browserStore={browserStore1} trackStore={trackStore1} />
      </div>
      <div style={{ border: "1px solid #ccc", margin: "10px" }}>
        <h3>Browser 2</h3>
        <Browser browserStore={browserStore2} trackStore={trackStore2} />
      </div>
    </div>
  );
}

// Example usage: Shared browser store (synchronized domain), independent tracks
export function SynchronizedBrowsers() {
  const sharedBrowserStore = createBrowserStore(initialBrowserState);
  const trackStore1 = createTrackStore(tracks1);
  const trackStore2 = createTrackStore(tracks2);

  return (
    <div>
      <h2>Synchronized Browsers (Shared Domain)</h2>
      <div style={{ border: "1px solid #ccc", margin: "10px" }}>
        <h3>Browser 1 - Track 1</h3>
        <Browser browserStore={sharedBrowserStore} trackStore={trackStore2} />
      </div>
      <div style={{ border: "1px solid #ccc", margin: "10px" }}>
        <h3>Browser 2 - Track 2</h3>
        <Browser browserStore={sharedBrowserStore} trackStore={trackStore1} />
      </div>
    </div>
  );
}

// Example usage: Single browser (backward compatibility)
export function SingleBrowser() {
  const browserStore = createBrowserStore(initialBrowserState);
  const trackStore = createTrackStore([...tracks1, ...tracks2]);

  return (
    <div>
      <h2>Single Browser</h2>
      <div style={{ border: "1px solid #ccc", margin: "10px" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} />
      </div>
    </div>
  );
}

// Main demo component
export default function MultipleBrowserDemo() {
  return (
    <div>
      <h1>Multiple Browser Instance Demo</h1>
      <SingleBrowser />
      <IndependentBrowsers />
      <SynchronizedBrowsers />
    </div>
  );
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MultipleBrowserDemo />
  </StrictMode>
);