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
  const browserStore = createBrowserStore({
    domain: { chromosome: "chr19", start: 33388478, end: 33436600 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
  });

  const [hovered, setHovered] = useState<ManhattanPoint | null>(null);

  const trackStore = createTrackStore(
    [
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
    ],
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

  const dataStore = createDataStore();

  // useManhattanData(browserStore, dataStore);
  useLDData(dataStore);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
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

function useLDData(dataStore: DataStoreInstance) {
  const { data, error, loading } = useQuery(LD_QUERY, {
    variables: { study: ["Dastani_Z-22479202-Adiponectin_levels"] },
  });
  if (data?.getSNPsforGWASStudies) {
    console.log(data?.getSNPsforGWASStudies);
  }
  useCustomData(ldTrack.id, { data: data?.getSNPsforGWASStudies, error, loading }, dataStore);
}

function DomainInfo({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((state) => state.domain);
  // const setDomain = browserStore((state) => state.setDomain);
  // const onClick = () => {
  //   setDomain({ chromosome: "chr1", start: 207508704, end: 207528704 });
  // };
  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <MethylCTest />
  </GQLWrapper>
);
