import React, { useEffect, useMemo } from "react";
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
  Chromosome,
} from "../src/lib";
import { createRoot } from "react-dom/client";
import { bigBedExample, transcriptExample } from "./tracks";
import { LDTrackConfig } from "../src/components/tracks/ldtrack/types";
import { gql, useQuery } from "@apollo/client";
import { LD_QUERY } from "../src/api/queries";
import { ManhattanPoint, ManhattanTrackConfig } from "../src/components/tracks/manhattan/types";

// const ldTrack: LDTrackConfig = {
//   id: "ld",
//   title: "LD",
//   trackType: TrackType.LDTrack,
//   displayMode: DisplayMode.Full,
//   height: 50,
//   titleSize: 12,
//   color: "#ff0000",
// };

const manhattanTrack: ManhattanTrackConfig = {
  id: "manhattan",
  title: "Manhattan",
  trackType: TrackType.Manhattan,
  displayMode: DisplayMode.Full,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
};

const browserStore = createBrowserStore({
  domain: { chromosome: "chr1", start: 207508704, end: 207528704 },
  marginWidth: 100,
  trackWidth: 1400,
  multiplier: 3,
});

const trackStore = createTrackStore([transcriptExample, manhattanTrack]);

const dataStore = createDataStore();

/**
 * This example shows how to use custom data fetching for the LD track. Notice how the stores
 * are created out of the component. This avoids re-rendering the browser when the data is fetched
 * in turn avoiding re-initializing the stores.
 * @returns
 */
function MethylCTest() {
  useManhattanData();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <DomainInfo browserStore={browserStore} />
      <div style={{ width: "90%" }}>
        <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
      </div>
    </div>
  );
}

const GWAS_CCRE_QUERY = gql`
  query gwasintersectingSnpsWithCcre($disease: String!, $snpid: String, $limit: Int) {
    gwasintersectingSnpsWithCcreQuery(disease: $disease, snpid: $snpid, limit: $limit) {
      disease
      snpid
      snp_chrom
      snp_start
      snp_stop
      riskallele
      associated_gene
      association_p_val
      ccre_chrom
      ccre_start
      ccre_stop
      rdhsid
      ccreid
      ccre_class
    }
  }
`;

const GWAS_BCRE_QUERY = gql`
  query gwasintersectingSnpsWithBcre($disease: String!, $snpid: String, $bcre_group: String, $limit: Int) {
    gwasintersectingSnpsWithBcreQuery(disease: $disease, snpid: $snpid, bcre_group: $bcre_group, limit: $limit) {
      disease
      snpid
      snp_chrom
      snp_start
      snp_stop
      riskallele
      associated_gene
      association_p_val
      ccre_chrom
      ccre_start
      ccre_stop
      rdhsid
      ccreid
      ccre_class
      bcre_group
    }
  }
`;

type GWAS_SNP = {
  __typename: "GwasIntersectingSnpsWithBcre" | "GwasIntersectingSnpsWithCcre";
  associated_gene: string;
  association_p_val: number[];
  bcre_group: string;
  ccre_chrom: Chromosome;
  ccre_class: string;
  ccre_start: number;
  ccre_stop: number;
  ccreid: string;
  disease: string;
  rdhsid: string;
  riskallele: string;
  snp_chrom: Chromosome;
  snp_start: number;
  snp_stop: number;
  snpid: string;
};

function useManhattanData() {
  const {
    data: ccreData,
    error: ccreError,
    loading: ccreLoading,
  } = useQuery(GWAS_CCRE_QUERY, {
    variables: {
      disease: "Alzheimers",
    },
  });

  const {
    data: bcreData,
    error: bcreError,
    loading: bcreLoading,
  } = useQuery(GWAS_BCRE_QUERY, {
    variables: {
      disease: "Alzheimers",
    },
  });

  const data = useMemo(() => {
    if (!ccreData?.gwasintersectingSnpsWithCcreQuery || !bcreData?.gwasintersectingSnpsWithBcreQuery) {
      return [];
    }

    const manhattanPoints = [
      ...ccreData?.gwasintersectingSnpsWithCcreQuery,
      ...bcreData?.gwasintersectingSnpsWithBcreQuery,
    ].map(
      (x: GWAS_SNP) =>
        ({
          chr: x.snp_chrom,
          start: x.snp_start,
          end: x.snp_stop,
          snpid: x.snpid,
          p_value: x.association_p_val[0],
          is_lead: false,
          associated_snps: [],
        }) as ManhattanPoint
    );
    return manhattanPoints;
  }, [ccreData, bcreData]);

  useCustomData(
    manhattanTrack.id,
    {
      data,
      error: ccreError || bcreError,
      loading: ccreLoading || bcreLoading,
    },
    dataStore
  );
}

// function useLDData() {
//   const { data, error, loading } = useQuery(LD_QUERY, {
//     variables: { study: ["Dastani_Z-22479202-Adiponectin_levels"] },
//   });
//   useCustomData(ldTrack.id, { data: data?.getSNPsforGWASStudies, error, loading }, dataStore);
// }

function DomainInfo({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((state) => state.domain);
  const setDomain = browserStore((state) => state.setDomain);
  const onClick = () => {
    setDomain({ chromosome: "chr1", start: 207508704, end: 207528704 });
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
