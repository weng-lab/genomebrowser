import React, { useMemo, useState } from "react";
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
  DataStoreInstance,
  LDTrackConfig,
  ManhattanPoint,
  ManhattanTrackConfig,
  TrackStoreInstance,
} from "../src/lib";
import { createRoot } from "react-dom/client";
import { transcriptExample } from "./tracks";
import { gql, useQuery } from "@apollo/client";
import { BIGDATA_QUERY, LD_QUERY } from "../src/api/queries";

const ldTrack: LDTrackConfig = {
  id: "ld",
  title: "LD",
  trackType: TrackType.LDTrack,
  displayMode: DisplayMode.GenericLD,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
  showScore: false,
};

const manhattanTrack: ManhattanTrackConfig = {
  id: "manhattan",
  title: "Manhattan",
  trackType: TrackType.Manhattan,
  displayMode: DisplayMode.Scatter,
  height: 75,
  titleSize: 12,
  color: "#ff0000",
  cutoffLabel: "5e-8",
};

/**
 * This example shows how to use custom data fetching for the LD track. Notice how the stores
 * are created out of the component. This avoids re-rendering the browser when the data is fetched
 * in turn avoiding re-initializing the stores.
 * @returns
 */
function MethylCTest() {
  const browserStore = useMemo(
    () =>
      createBrowserStore({
        // chr19:33,388,478-33,436,600
        domain: { chromosome: "chr19", start: 33388478, end: 33436600 },
        marginWidth: 100,
        trackWidth: 1400,
        multiplier: 3,
      }),
    []
  );

  const [hovered, setHovered] = useState<ManhattanPoint | null>(null);

  const trackStore = useMemo(
    () =>
      createTrackStore([
        transcriptExample,
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
      ]),
    [setHovered]
  );
  const editTrack = trackStore((state) => state.editTrack);

  const result = useQuery(ldQuery, {
    variables: {
      id: [hovered?.snpId],
    },
  });

  if (result.data?.snp[0]) {
    editTrack(manhattanTrack.id, {
      associatedSnps: result.data.snp[0].linkageDisequilibrium.map((ld: any) => ld.id),
    });
    editTrack(ldTrack.id, {
      associatedSnps: result.data.snp[0].linkageDisequilibrium.map((ld: any) => ld.id),
      lead: hovered?.snpId,
    });
  }

  if (!hovered) {
    editTrack(manhattanTrack.id, {
      associatedSnps: [],
    });
    editTrack(ldTrack.id, {
      associatedSnps: [],
    });
  }

  const dataStore = useMemo(() => createDataStore(), []);

  useManhattanData(browserStore, dataStore);
  // useLDData(dataStore);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} trackStore={trackStore} />
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
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

const ldQuery = gql(`
query snips_in_ld($id: [String]) {
  snp: snpQuery(assembly: "hg38", snpids: $id) {
    linkageDisequilibrium(rSquaredThreshold: 0.7, population: EUROPEAN) {
      id
      rSquared
      coordinates(assembly: "hg38") {
        chromosome
        start
        end
        __typename
       }
      __typename
    }
  __typename
  }
}
`);

function DomainInfo({
  browserStore,
  trackStore,
}: {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
}) {
  const domain = browserStore((state) => state.domain);
  const onClick = () => {};
  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
      <button onClick={onClick}>Save State</button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <MethylCTest />
  </GQLWrapper>
);
