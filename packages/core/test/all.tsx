import { createRoot } from "react-dom/client";
import {
  Browser,
  BrowserStoreInstance,
  createBrowserStoreMemo,
  createDataStoreMemo,
  createTrackStoreMemo,
  DataStoreInstance,
  GQLWrapper,
  ManhattanPoint,
  TrackStoreInstance,
  useCustomData,
} from "../src/lib";
import {
  bamExample,
  bigBedExample,
  bigWigExample,
  bigWigFillZero,
  bulkBedExample,
  importanceExample,
  ldTrack,
  manhattanTrack,
  methylCTrack,
  motifExample,
  transcriptExample,
} from "./tracks";
import { useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { BIGDATA_QUERY } from "../src/api/queries";

/**
 * A test page using all track types
 * @returns
 */
export default function All() {
  const browserStore = createBrowserStoreMemo(
    {
      // chr21:33,038,946-33,039,092 (UCSC BAM example region)
      domain: { chromosome: "chr21", start: 33038946, end: 33039092 },
      marginWidth: 50,
      trackWidth: 1450,
      multiplier: 3,
      highlights: [],
    },
    []
  );

  const trackStore = createTrackStoreMemo(
    [
      bamExample,
      transcriptExample,
      bigWigExample,
      // bigWigFillZero,
      // bigBedExample,
      // motifExample,
      // bulkBedExample,
      // methylCTrack,
      // manhattanTrack,
      // ldTrack,
    ],
    []
  );

  const dataStore = createDataStoreMemo([]);

  // useImportanceTrack(browserStore, trackStore, dataStore);
  // useManhattanData(browserStore, dataStore);

  return <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />;
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <All />
  </GQLWrapper>
);

function useImportanceTrack(
  browserStore: BrowserStoreInstance,
  trackStore: TrackStoreInstance,
  dataStore: DataStoreInstance
) {
  const reset = dataStore((state) => state.reset);

  const insertTrack = trackStore((state) => state.insertTrack);
  const removeTrack = trackStore((state) => state.removeTrack);
  const getTrack = trackStore((state) => state.getTrack);

  const domain = browserStore((state) => state.domain);
}

// function useHovered(hovered: ManhattanPoint | null) {
//   const [hovered, setHovered] = useState<ManhattanPoint | null>(null);
//   const result = useQuery(ldQuery, {
//     variables: {
//       id: [hovered?.snpId],
//     },
//   });

//   if (result.data?.snp[0]) {
//     editTrack(manhattanTrack.id, {
//       associatedSnps: result.data.snp[0].linkageDisequilibrium.map((ld: any) => ld.id),
//     });
//     editTrack(ldTrack.id, {
//       associatedSnps: result.data.snp[0].linkageDisequilibrium.map((ld: any) => ld.id),
//       lead: hovered?.snpId,
//     });
//   }

//   if (!hovered) {
//     editTrack(manhattanTrack.id, {
//       associatedSnps: [],
//     });
//     editTrack(ldTrack.id, {
//       associatedSnps: [],
//     });
//   }
// }

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
