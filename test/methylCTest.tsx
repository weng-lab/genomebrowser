import React, { StrictMode } from "react";
import { Browser, createBrowserStore, createTrackStore, DisplayMode, MethylCConfig, TrackType } from "../src/lib";
import { createRoot } from "react-dom/client";

const methylCTrack: MethylCConfig = {
  id: "methylC",
  trackType: TrackType.MethylC,
  displayMode: DisplayMode.Split,
  title: "MethylC Track",
  titleSize: 12,
  height: 100,
  color: "#4287f5",
  urls: {
    plusStrand: {
      cpg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      chg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      chh: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      depth: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
    },
    minusStrand: {
      cpg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      chg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      chh: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
      depth: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw", color: "#000000" },
    },
  },
};

export default function MethylCTest() {
  const browserStore = createBrowserStore({
    domain: { chromosome: "chr12", start: 53380037 - 20000, end: 53380206 + 20000 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const trackStore = createTrackStore([methylCTrack]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MethylCTest />
  </StrictMode>
);
