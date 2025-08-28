import React, { StrictMode } from "react";
import {
  Browser,
  createBrowserStore,
  createTrackStore,
  DisplayMode,
  MethylCConfig,
  TrackType,
  GQLWrapper,
  BrowserStoreInstance,
  BigWigConfig,
} from "../src/lib";
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
    chh: "#ff00ff", // rgb(25, 14, 25)
    depth: "#525252", // rgb(82, 82, 82)
  },
  urls: {
    plusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_cpg_pos.bw" },
      chg: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_chg_pos.bw" },
      chh: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_chh_pos.bw" },
      depth: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_coverage_pos.bw" },
    },
    minusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_cpg_neg.bw" },
      chg: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_chg_neg.bw" },
      chh: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_chh_neg.bw" },
      depth: { url: "https://users.wenglab.org/mezaj/EB100001/EB100001_coverage_neg.bw" },
    },
  },
};

const bigWig: BigWigConfig = {
  id: "bigWig",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  title: "BigWig Track",
  titleSize: 12,
  height: 100,
  color: "#000000",
  url: "https://users.wenglab.org/mezaj/EB100001/EB100001_cpg_pos.bw",
};

const phyloP: BigWigConfig = {
  id: "phyloP",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  title: "PhyloP Track",
  titleSize: 12,
  height: 100,
  color: "#000000",
  range: { min: -2, max: 8 },
  url: "https://downloads.wenglab.org/hg38.phyloP100way.bw",
};

export default function MethylCTest() {
  const browserStore = createBrowserStore({
    domain: { chromosome: "chr12", start: 53380037 - 20000, end: 53380206 + 20000 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const trackStore = createTrackStore([methylCTrack, bigWig, phyloP]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
      <div style={{ width: "90%" }}>
        <GQLWrapper>
          <Browser browserStore={browserStore} trackStore={trackStore} />
        </GQLWrapper>
      </div>
    </div>
  );
}

function DomainInfo({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((state) => state.domain);
  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MethylCTest />
  </StrictMode>
);
