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
import { bigBedExample, transcriptExample } from "./tracks";
import { LDTrackConfig } from "../src/components/tracks/ldtrack/types";
import { useLazyQuery, useQuery } from "@apollo/client";
import { LD_QUERY } from "../src/api/queries";
import { createDataStore, DataStoreInstance } from "../src/store/dataStore";

const ldTrack: LDTrackConfig = {
  id: "ld",
  title: "LD",
  trackType: TrackType.LDTrack,
  displayMode: DisplayMode.Full,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
  study: ["Fritsche_LG-26691988-Advanced_age-related_macular_degeneration"],
};

export default function MethylCTest() {
  // chr6:31917912-31957912
  const browserStore = createBrowserStore({
    domain: { chromosome: "chr6", start: 31791119, end: 31871119 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const trackStore = createTrackStore([transcriptExample, ldTrack, bigBedExample]);

  const dataStore = createDataStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
      {/* <LDDataFetcher ldTrack={ldTrack} browserStore={browserStore} dataStore={dataStore} /> */}
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
}

function LDDataFetcher({
  ldTrack,
  browserStore,
  dataStore,
}: {
  ldTrack: LDTrackConfig;
  browserStore: BrowserStoreInstance;
  dataStore: DataStoreInstance;
}) {
  const domain = browserStore((state) => state.domain);
  const setData = dataStore((state) => state.setDataById);

  const { data, error, loading } = useQuery(LD_QUERY, {
    variables: { study: ldTrack.study },
  });

  let out = undefined;
  if (data) {
    const snps = data.getSNPsforGWASStudies;
    const withinDomain = snps.filter((snp) => {
      return snp.chromosome === domain.chromosome && snp.start >= domain.start && snp.end <= domain.end;
    });
  }

  setData(ldTrack.id, out, error);
  return null;
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
