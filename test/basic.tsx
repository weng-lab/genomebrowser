import React, { useEffect } from "react";
import {
  Browser,
  createBrowserStore,
  createTrackStore,
  DisplayMode,
  TrackType,
  GQLWrapper,
  BrowserStoreInstance,
  useCustomData,
  createDataStore,
} from "../src/lib";
import { createRoot } from "react-dom/client";
import { bigBedExample, transcriptExample } from "./tracks";
import { LDTrackConfig } from "../src/components/tracks/ldtrack/types";
import { useQuery } from "@apollo/client";
import { LD_QUERY } from "../src/api/queries";

const ldTrack: LDTrackConfig = {
  id: "ld",
  title: "LD",
  trackType: TrackType.LDTrack,
  displayMode: DisplayMode.Full,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
};
const browserStore = createBrowserStore({
  domain: { chromosome: "chr13", start: 33415216 - 20000, end: 33415217 + 20000 },
  marginWidth: 100,
  trackWidth: 1400,
  multiplier: 3,
  highlights: [
    {
      id: "highlight",
      domain: { chromosome: "chr19", start: 33415216 - 200, end: 33415217 + 200 },
      color: "#ff0000",
    },
  ],
});

const trackStore = createTrackStore([transcriptExample, ldTrack, bigBedExample, { ...bigBedExample, id: "123412" }]);

const dataStore = createDataStore();

/**
 * This example shows how to use custom data fetching for the LD track. Notice how the stores
 * are created out of the component. This avoids re-rendering the browser when the data is fetched
 * in turn avoiding re-initializing the stores.
 * @returns
 */
function MethylCTest() {
  const setDomain = browserStore((state) => state.setDomain);
  const response = useLDData();
  useCustomData(ldTrack.id, response, dataStore);

  useEffect(() => {
    setDomain({ chromosome: "chr19", start: 33415216 - 20000, end: 33415217 + 20000 });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
}

function useLDData() {
  const { data, error, loading } = useQuery(LD_QUERY, {
    variables: { study: ["Dastani_Z-22479202-Adiponectin_levels"] },
  });

  return { data: data?.getSNPsforGWASStudies, error, loading };
}

function DomainInfo({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((state) => state.domain);
  const setDomain = browserStore((state) => state.setDomain);
  const onClick = () => {
    setDomain({ chromosome: "chr19", start: 33415216 - 20000, end: 33415217 + 20000 });
  };
  return (
    <div>
      <button onClick={onClick}>Set Domain</button>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <MethylCTest />
  </GQLWrapper>
);
