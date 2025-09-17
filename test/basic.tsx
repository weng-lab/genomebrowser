import React, { StrictMode, useEffect, useMemo } from "react";
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
import { createDataStore, DataStoreInstance } from "../src/store/dataStore";
import { ApolloError, useQuery } from "@apollo/client";
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
        <LDDataFetcher ldTrack={ldTrack} browserStore={browserStore} dataStore={dataStore} />
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
}

function useCustomData({
  trackId,
  data,
  loading,
  error,
  dataStore,
}: {
  trackId: string;
  data: any;
  loading: boolean;
  error: ApolloError | undefined;
  dataStore: DataStoreInstance;
}) {
  const setDataById = dataStore((state) => state.setDataById);
  const fetching = dataStore((state) => state.fetching);
  const globalLoading = dataStore((state) => state.loading);

  useEffect(() => {
    if (data && !loading && !error && !fetching && !globalLoading) {
      setDataById(trackId, data, error);
    }
  }, [data, loading, error, fetching, trackId, globalLoading]);
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
  const getExpandedDomain = browserStore((state) => state.getExpandedDomain);
  const domain = getExpandedDomain();
  const { data, error, loading } = useQuery(LD_QUERY, {
    variables: { study: ["Dastani_Z-22479202-Adiponectin_levels"] },
  });

  const processedData = useMemo(() => {
    if (data && !error && !loading) {
      return data.getSNPsforGWASStudies.filter((snp: any) => {
        const pastStart = snp.start >= domain.start;
        const behindEnd = snp.stop <= domain.end;
        const sameDomain = snp.chromosome === domain.chromosome;
        return pastStart && behindEnd && sameDomain;
      });
    }
    return [];
  }, [data, error, loading, domain]);

  useCustomData({ trackId: ldTrack.id, data: processedData, loading, error, dataStore });
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
