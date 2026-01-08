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
  bigBedExample,
  bigWigExample,
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
      // chr11:5,202,705-5,556,088
      domain: { chromosome: "chr11", start: 5202705, end: 5556088 },
      marginWidth: 100,
      trackWidth: 1400,
      multiplier: 3,
      highlights: [
        // chr11:5,253,188-5,505,605
        { id: "test", color: "#ff0000", domain: { chromosome: "chr11", start: 5253188, end: 5505605 } },
      ],
    },
    []
  );

  const trackStore = createTrackStoreMemo(
    [
      transcriptExample,
      bigWigExample,
      bigBedExample,
      // motifExample,
      // bulkBedExample,
      // methylCTrack,
      // manhattanTrack,
      // ldTrack,
    ],
    []
  );

  const dataStore = createDataStoreMemo([]);

  useImportanceTrack(browserStore, trackStore, dataStore);
  useManhattanData(browserStore, dataStore);
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
  useEffect(() => {
    const len = domain.end - domain.start;
    if (getTrack(importanceExample.id)) {
      return;
    }
    if (len <= 2000) {
      insertTrack(importanceExample);
      reset();
    } else {
      removeTrack(importanceExample.id);
    }
  }, [domain, insertTrack, removeTrack, reset, getTrack]);
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
