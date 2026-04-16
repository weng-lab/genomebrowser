import { createRoot } from "react-dom/client";
import {
  BigBedConfig,
  InferBigBedRow,
  Browser,
  BrowserStoreInstance,
  Chromosome,
  createBrowserStoreMemo,
  createDataStoreMemo,
  defineBigBedSchema,
  createTrackStoreMemo,
  DataStoreInstance,
  Domain,
  GQLWrapper,
  ManhattanPoint,
  TrackStoreInstance,
  useCustomData,
} from "../src/lib";
import { tfPeaksTrack } from "./TfPeaks";
import {
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client";
import { BIGDATA_QUERY } from "../src/api/queries";

const mohdSchema = defineBigBedSchema({
  // name: "string",
  // score: "number",
  // strand: "string",
  // signalValue: "number",
  // pValue: "number",
  // qValue: "number",
  // peak: "number",
});

type MohdBigBedRow = InferBigBedRow<typeof mohdSchema>;

/**
 * A test page using all track types
 */
export default function All() {
  const mohdTrack: BigBedConfig<typeof mohdSchema> = {
    ...bigBedExample,
    id: "mohd",
    title: "MOHD",
    url: "https://downloads.mohdconsortium.org/2_ATAC/MOHD_EA100001/MOHD_EA100001_peaks-FDR5_GRCh38_v0.bigBed",
    schema: mohdSchema,
    onClick: (row: MohdBigBedRow) => {
      console.log(row);
    },
  };

  const browserStore = createBrowserStoreMemo(
    {
      // chr12:53,372,922-53,423,700
      domain: { chromosome: "chr12", start: 53372922, end: 53423700 },
      marginWidth: 50,
      trackWidth: 950,
      multiplier: 3,
      highlights: [
        // chr11:5,253,188-5,505,605
        // { id: "test", color: "#ff0000", domain: { chromosome: "chr11", start: 5253188, end: 5505605 } },
      ],
    },
    []
  );

  const trackStore = createTrackStoreMemo(
    [
      // bigWigExample,
      // bigWigFillZero,
      transcriptExample,
      {
        ...bigBedExample,
        onClick: (r) => {
          console.log(r);
        },
      },
      mohdTrack,
      // tfPeaksTrack,
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

  return (
    <>
      <DomainNav browserStore={browserStore} />
      <Browser browserStore={browserStore} trackStore={trackStore} externalDataStore={dataStore} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <GQLWrapper>
    <All />
  </GQLWrapper>
);

function DomainNav({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((s) => s.domain);
  const setDomain = browserStore((s) => s.setDomain);

  const [inputValue, setInputValue] = useState("");
  const historyRef = useRef<Domain[]>([]);
  const [historyLen, setHistoryLen] = useState(0); // for re-render on undo enable/disable

  // sync input from store domain
  useEffect(() => {
    setInputValue(`${domain.chromosome}:${domain.start}-${domain.end}`);
  }, [domain]);

  // read domain directly from store to avoid stale closures
  const getDomain = useCallback(() => browserStore.getState().domain, [browserStore]);

  const pushAndSet = useCallback(
    (next: Domain) => {
      historyRef.current = [...historyRef.current, { ...getDomain() }];
      setHistoryLen(historyRef.current.length);
      setDomain(next);
    },
    [getDomain, setDomain]
  );

  const handleSubmit = useCallback(() => {
    const match = inputValue.match(/^(chr\w+):(\d[\d,]*)-(\d[\d,]*)$/);
    if (!match) return;
    const chromosome = match[1] as Chromosome;
    const start = parseInt(match[2].replace(/,/g, ""), 10);
    const end = parseInt(match[3].replace(/,/g, ""), 10);
    if (isNaN(start) || isNaN(end) || start >= end) return;
    pushAndSet({ chromosome, start, end });
  }, [inputValue, pushAndSet]);

  const shift = useCallback(
    (direction: -1 | 1) => {
      const d = getDomain();
      const span = d.end - d.start;
      const amount = Math.floor(span * 0.25);
      pushAndSet({
        chromosome: d.chromosome,
        start: d.start + amount * direction,
        end: d.end + amount * direction,
      });
    },
    [getDomain, pushAndSet]
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLen(historyRef.current.length);
    setDomain(prev);
  }, [setDomain]);

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 0",
    fontFamily: "monospace",
    fontSize: 13,
  };
  const btnStyle: React.CSSProperties = {
    padding: "2px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 13,
  };

  return (
    <div style={style}>
      <button style={btnStyle} onClick={undo} disabled={historyLen === 0}>
        Undo
      </button>
      <button style={btnStyle} onClick={() => shift(-1)}>
        ◀
      </button>
      <input
        style={{ fontFamily: "monospace", fontSize: 13, width: 260, padding: "2px 4px" }}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button style={btnStyle} onClick={() => shift(1)}>
        ▶
      </button>
    </div>
  );
}

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
