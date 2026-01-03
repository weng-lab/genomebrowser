import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import {
  BigBedConfig,
  Browser,
  DisplayMode,
  GQLWrapper,
  TrackType,
  TranscriptConfig,
  createBrowserStoreMemo,
  createDataStoreMemo,
  createTrackStoreMemo,
  useCustomData,
} from "../src/lib";
import { useEffect, useMemo, useState } from "react";
import { ApolloError, gql, useQuery } from "@apollo/client";
globalThis.Buffer = Buffer;

export default function LD() {
  const {
    data: data,
    loading: loading,
    error: error,
  } = useGWASSnpsData({ studyid: ["36810956-GCST90296476-astrocytoma"] });

  const ldblockStats = useMemo(() => {
    if (!data) return [];

    const map = new Map<number, { ldblock: number; chromosome: string; start: number; end: number }>();

    for (const { ldblock, chromosome, start, stop } of data) {
      if (!map.has(ldblock)) {
        map.set(ldblock, { ldblock, chromosome, start, end: stop });
      } else {
        const entry = map.get(ldblock)!;
        entry.start = Math.min(entry.start, start);
        entry.end = Math.max(entry.end, stop);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.ldblock - b.ldblock);
  }, [data]);

  const [selectedLdBlock, setselectedLdBlock] = useState<{
    ldblock: number;
    chromosome: string;
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    if (ldblockStats.length > 0 && !selectedLdBlock) {
      setselectedLdBlock(ldblockStats[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ldblockStats]);

  const coordinates = useMemo(() => {
    if (selectedLdBlock) {
      return {
        chromosome: selectedLdBlock.chromosome,
        start: selectedLdBlock.start,
        end: selectedLdBlock.end,
      };
    }
    if (!ldblockStats || ldblockStats === null || ldblockStats.length === 0)
      return {
        chromosome: "chr1",
        start: 1000000,
        end: 1500000,
      };
    return { chromosome: ldblockStats[0].chromosome, start: ldblockStats[0].start, end: ldblockStats[0].end };
  }, [selectedLdBlock, ldblockStats]);

  const dataStore = createDataStoreMemo();
  const setTrackData = dataStore((s) => s.setTrackData);
  useEffect(() => {
    const trackId = "ld-track-ignore";
    if (loading) {
      setTrackData(trackId, { data: null, error: null });
    } else if (error) {
      setTrackData(trackId, { data: null, error: error.message });
    } else if (data) {
      setTrackData(trackId, { data: data, error: null });
    }
  }, [data, error, loading, setTrackData]);

  const browserStore = createBrowserStoreMemo({
    // chr1:68,165,395-69,097,398
    // domain: { ...coordinates, chromosome: coordinates.chromosome as Chromosome },
    domain: { chromosome: "chr1", start: 68165395, end: 69097398 },
    marginWidth: 150,
    trackWidth: 1350,
    multiplier: 3,
  });

  const trackStore = createTrackStoreMemo([
    {
      ...defaultTranscript,
      color: "#0c184a",
      id: "human-genes-ignore",
      assembly: "GRCh38",
      version: 40,
    },
    {
      ...defaultBigBed,
      color: "#0c184a",
      id: "human-ccre-ignore",
      title: "All cCREs colored by group",
      url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
    },
    {
      id: "ld-track-ignore",
      title: "LD",
      trackType: TrackType.LDTrack,
      displayMode: DisplayMode.LDBlock,
      height: 50,
      titleSize: 12,
      color: "#ff0000",
    },
  ]);

  useCustomData(
    "ld-track-ignore",
    {
      data: data,
      loading: loading,
      error: error,
    },
    dataStore
  );

  if (loading || coordinates === null) return <>Loading</>;
  if (error) return <>Error Fetching Genome Browser</>;
  return <Browser trackStore={trackStore} browserStore={browserStore} externalDataStore={dataStore} />;
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <LD />
  </GQLWrapper>
);

export type UseGWASSnpsParams = {
  studyid: string[];
};

export type GetSnPsIdentifiedbyGivenStudyQuery = {
  __typename?: "GwasStudiesSNPs";
  snpid: string;
  ldblock: number;
  studyid: string;
  ldblocksnpid: string;
  rsquare: string;
  stop: number;
  start: number;
  chromosome: string;
}[];

export type UseGWASSnpsReturn = {
  data: GetSnPsIdentifiedbyGivenStudyQuery | undefined;
  loading: boolean;
  error: ApolloError;
};

const GWAS_SNP_QUERY = gql(`
  query getSNPsIdentifiedbyGivenStudy($studyid: [String!]!) {
  getSNPsforGivenGWASStudy(studyid: $studyid) {
    snpid
    ldblock
    studyid
    ldblocksnpid
    rsquare
    stop
    start
    chromosome
  }
}
`);

export const useGWASSnpsData = ({ studyid }: UseGWASSnpsParams): UseGWASSnpsReturn => {
  const { data, loading, error } = useQuery(GWAS_SNP_QUERY, {
    variables: {
      studyid,
    },
    skip: !studyid || studyid.length === 0,
  });

  return {
    data: data?.getSNPsforGivenGWASStudy,
    loading,
    error,
  };
};

export const defaultBigBed: Omit<BigBedConfig, "id" | "title" | "url"> = {
  trackType: TrackType.BigBed,
  height: 20,
  displayMode: DisplayMode.Dense,
  titleSize: 12,
};

export const defaultTranscript: Omit<TranscriptConfig, "id" | "assembly" | "version"> = {
  title: "GENCODE Genes",
  trackType: TrackType.Transcript,
  displayMode: DisplayMode.Squish,
  height: 100,
  color: "#0c184a", // screen theme default
  canonicalColor: "#100e98", // screen theme light
  highlightColor: "#3c69e8", // bright blue
  titleSize: 12,
};
