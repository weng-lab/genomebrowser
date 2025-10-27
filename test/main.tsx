import React, { StrictMode, useEffect, useMemo, useState } from "react";
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
  ManhattanPoint,
  useCustomData,
} from "../src/lib";
import {
  bigBedExample,
  bigWigExample,
  transcriptExample,
  motifExample,
  bulkBedExample,
  methylCTrack,
  phyloP,
  manhattanTrack,
  ldTrack,
} from "./tracks";
import { BIGDATA_QUERY, LD_QUERY } from "../src/api-legacy/queries";
import { useQuery } from "@apollo/client";

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

  const [hovered, setHovered] = useState<ManhattanPoint | null>(null);

  const trackStore = createTrackStoreMemo(
    [
      transcriptExample,
      bigWigExample,
      bigBedExample,
      motifExample,
      bulkBedExample,
      methylCTrack,
      phyloP,
      {
        ...manhattanTrack,
        onHover: (item) => {
          setHovered(item);
        },
      },
      {
        ...ldTrack,
        onHover: (item) => {
          setHovered(item);
        },
      },
    ],
    []
  );

  const dataStore = createDataStoreMemo();

  useManhattanData(browserStore, dataStore);

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
      insertTrack({
        ...bigWigExample,
        id: "newTrack",
      });
    }, 5000);
  });

  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

function Action({ browserStore, dataStore }: { browserStore: BrowserStoreInstance; dataStore: DataStoreInstance }) {
  const setDomain = browserStore((state) => state.setDomain);
  const reset = dataStore((state) => state.reset);

  const onClick = () => {
    reset();
    setDomain({ chromosome: "chr19", start: 44905754 - 40000, end: 44909393 - 20000 });
  };

  return <button onClick={onClick}>Click for action</button>;
}

function useManhattanData(browserStore: BrowserStoreInstance, dataStore: DataStoreInstance) {
  const getDomain = browserStore((state) => state.getExpandedDomain);
  const preRenderedWidth = browserStore((state) => state.trackWidth * state.multiplier);
  const { data, error, loading } = useQuery(BIGDATA_QUERY, {
    variables: {
      bigRequests: [
        {
          url: "https://downloads.wenglab.org/pyschscreensumstats/GWAS_fullsumstats/Alzheimers_Bellenguez_meta.formatted.bigBed",
          chr1: getDomain().chromosome,
          start: getDomain().start,
          end: getDomain().end,
          preRenderedWidth,
        },
      ],
    },
  });

  const manhattanData = useMemo(() => {
    if (!data) return [];
    const points = data.bigRequests[0].data;
    return points.map((snp: any) => {
      return {
        snpId: snp.name.split("_")[0],
        value: snp.name.split("_")[1],
        chr: snp.chr,
        start: snp.start,
        end: snp.end,
      } as ManhattanPoint;
    });
  }, [data]);

  useCustomData(
    manhattanTrack.id,
    {
      data: manhattanData,
      error,
      loading,
    },
    dataStore
  );
  useCustomData(
    ldTrack.id,
    {
      data: manhattanData,
      error,
      loading,
    },
    dataStore
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GQLWrapper>
      <Main />
    </GQLWrapper>
  </StrictMode>
);
