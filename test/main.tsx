import React, { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import {
  Browser,
  createTrackStore,
  DisplayMode,
  TrackType,
  createBrowserStore,
  BrowserStoreInstance,
  Cytobands,
  GQLWrapper,
  MethylCConfig,
  Vibrant,
} from "../src/lib";
import { transcriptExample } from "./tracks";

const path = "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001";

const methylCTrack: MethylCConfig = {
  id: "methylC",
  trackType: TrackType.MethylC,
  displayMode: DisplayMode.Split,
  title: "methylC",
  titleSize: 12,
  height: 80,
  color: Vibrant[1],
  colors: {
    cpg: "#648bd8", // rgb(100, 139, 216)
    chg: "#ff944d", // rgb(255, 148, 77)
    chh: "#ff00ff", // rgb(25, 14, 25)
    depth: "#525252", // rgb(82, 82, 82)
  },
  urls: {
    plusStrand: {
      cpg: {
        url: `${path}_cpg_pos.bw`,
      },
      chg: {
        url: `${path}_chg_pos.bw`,
      },
      chh: {
        url: `${path}_chh_pos.bw`,
      },
      depth: {
        url: `${path}_coverage_pos.bw`,
      },
    },
    minusStrand: {
      cpg: {
        url: `${path}_cpg_neg.bw`,
      },
      chg: {
        url: `${path}_chg_neg.bw`,
      },
      chh: {
        url: `${path}_chh_neg.bw`,
      },
      depth: {
        url: `${path}_coverage_neg.bw`,
      },
    },
  },
};

function Main() {
  const browserStore = createBrowserStore(
    {
      // chr7:27,092,993-27,095,996
      domain: { chromosome: "chr7", start: 27092993, end: 27095996 },
      marginWidth: 100,
      trackWidth: 1400,
      multiplier: 3,
      highlights: [
        { id: "1", color: "#ffaabb", domain: { chromosome: "chr18", start: 35496000, end: 35502000 } },
        { id: "2", color: "#aaffbb", domain: { chromosome: "chr18", start: 35494852, end: 35514000 } },
      ],
    },
    []
  );

  const trackStore = createTrackStore([transcriptExample, methylCTrack], []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Action browserStore={browserStore} />
      <DomainView browserStore={browserStore} />
      <div style={{ width: "90%" }}>
        <GQLWrapper>
          <Browser browserStore={browserStore} trackStore={trackStore} />
        </GQLWrapper>
      </div>
    </div>
  );
}

function DomainView({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((state) => state.domain);

  return (
    <div>
      <svg width={700} height={20}>
        <GQLWrapper>
          <Cytobands assembly="hg38" currentDomain={domain} />
        </GQLWrapper>
      </svg>
      <div>
        {domain.chromosome}:{domain.start}-{domain.end}
      </div>
    </div>
  );
}

function Action({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const setDomain = browserStore((state) => state.setDomain);

  const onClick = () => {
    setDomain({ chromosome: "chr18", start: 32300000, end: 38702000 });
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
