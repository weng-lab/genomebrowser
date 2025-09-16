import React, { StrictMode } from "react";
import {
  Browser,
  createBrowserStore,
  createTrackStore,
  DisplayMode,
  TrackType,
  GQLWrapper,
  BrowserStoreInstance,
} from "../src/lib";
import { createRoot } from "react-dom/client";
import { bigBedExample, transcriptExample } from "./tracks";
import { LDTrackConfig } from "../src/components/tracks/ldtrack/types";
import { createDataStore } from "../src/store/dataStore";

const ldTrack: LDTrackConfig = {
  id: "ld",
  title: "LD",
  trackType: TrackType.LDTrack,
  displayMode: DisplayMode.Full,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
  study: ["Dastani_Z-22479202-Adiponectin_levels"],
};

export default function MethylCTest() {
  // chr19:33415216-33415217
  const browserStore = createBrowserStore({
    domain: { chromosome: "chr19", start: 33415216 - 20000, end: 33415217 + 20000 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
    highlights: [
      {
        id: "highlight",
        //chr19:33,415,216-33,415,217
        domain: { chromosome: "chr19", start: 33415216 - 200, end: 33415217 + 200 },
        color: "#ff0000",
      },
    ],
  });
  const trackStore = createTrackStore([transcriptExample, ldTrack, bigBedExample]);

  const dataStore = createDataStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
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
    <GQLWrapper>
      <MethylCTest />
    </GQLWrapper>
  </StrictMode>
);
