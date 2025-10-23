import React, { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Browser,
  createTrackStoreMemo,
  createBrowserStoreMemo,
  BrowserStoreInstance,
  GQLWrapper,
  TrackStoreInstance,
} from "../src/lib";
import {
  bigBedExample,
  bigWigExample,
  transcriptExample,
  motifExample,
  bulkBedExample,
  methylCTrack,
  phyloP,
} from "./tracks";

function Main() {
  const browserStore = createBrowserStoreMemo(
    {
      domain: { chromosome: "chr19", start: 44905754 - 20000, end: 44909393 + 20000 },
      marginWidth: 100,
      trackWidth: 1400,
      multiplier: 3,
    },
    []
  );

  const trackStore = createTrackStoreMemo(
    [transcriptExample, bigWigExample, bigBedExample, motifExample, bulkBedExample, methylCTrack, phyloP],
    []
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Action browserStore={browserStore} />
      <DomainView browserStore={browserStore} trackStore={trackStore} />
      <div style={{ width: "90%" }}>
        <GQLWrapper>
          <Browser browserStore={browserStore} trackStore={trackStore} />
        </GQLWrapper>
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

  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
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
