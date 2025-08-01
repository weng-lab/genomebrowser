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
  color: "#000000",
  colors: {
    cpg: "#648bd8", // rgb(100, 139, 216)
    chg: "#ff944d", // rgb(255, 148, 77)
    chh: "#ff00ff", // rgb(255, 0, 255)
    depth: "#525252", // rgb(82, 82, 82)
  },
  urls: {
    plusStrand: {
      cpg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw" },
      chg: { url: "https://downloads.wenglab.org/ATAC_All_ENCODE_MAR20_2024_merged.bw" },
      chh: { url: "https://downloads.wenglab.org/CTCF_All_ENCODE_MAR20_2024_merged.bw" },
      depth: { url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw" },
    },
    minusStrand: {
      cpg: { url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw" },
      chg: { url: "https://downloads.wenglab.org/ATAC_All_ENCODE_MAR20_2024_merged.bw" },
      chh: { url: "https://downloads.wenglab.org/CTCF_All_ENCODE_MAR20_2024_merged.bw" },
      depth: { url: "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw" },
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
