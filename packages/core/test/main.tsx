import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Browser,
  createTrackStoreMemo,
  createBrowserStoreMemo,
  BrowserStoreInstance,
  GQLWrapper,
  TrackStoreInstance,
  DataStoreInstance,
  createDataStoreMemo,
  Pastels,
  createBigWigTrack,
} from "../src/lib";
import { bigWigExample } from "./tracks";

function Main() {
  const browserStore = createBrowserStoreMemo(
    {
      domain: { chromosome: "chr19", start: 44905754, end: 44905754 + 2000 },
      marginWidth: 100,
      trackWidth: 1400,
      multiplier: 3,
    },
    []
  );

  const trackStore = createTrackStoreMemo([bigWigExample], []);

  const dataStore = createDataStoreMemo();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Action browserStore={browserStore} dataStore={dataStore} />
      <DomainView browserStore={browserStore} trackStore={trackStore} />
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
}

function DomainView({
  browserStore,
  trackStore,
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
}) {
  const domain = browserStore((state) => state.domain);
  const insertTrack = trackStore((state) => state.insertTrack);
  useEffect(() => {
    setTimeout(() => {
      insertTrack(
        createBigWigTrack({
          ...bigWigExample,
          id: "newTrack",
          color: Pastels[2],
        })
      );
      insertTrack(
        createBigWigTrack({
          id: "newTracksojansdo",
          title: bigWigExample.title,
          url: "https://downloads.wenglab.org/igscreen/DNase_Bcells_merged_signal.bigWig",
          color: Pastels[0],
        })
      );
      insertTrack(
        createBigWigTrack({
          id: "oduanuoidsn",
          title: bigWigExample.title,
          url: "https://downloads.wenglab.org/igscreen/DNase_Bulk_Tcells_merged_signal.bigWig",
          color: Pastels[3],
        })
      );
    }, 5000);
  });

  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

function Action({ dataStore }: { browserStore: BrowserStoreInstance; dataStore: DataStoreInstance }) {
  const reset = dataStore((state) => state.reset);

  const onClick = () => {
    reset();
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <Main />
  </GQLWrapper>
);
