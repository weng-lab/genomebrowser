import { createRoot } from "react-dom/client";
import {
  Browser,
  BrowserStoreInstance,
  Chromosome,
  createBrowserStoreMemo,
  createDataStoreMemo,
  createTrackStoreMemo,
  Domain,
  GQLWrapper,
} from "../src/lib";
import {
  bigWigExample,
  bigWigFillZero,
  bigBedExample,
  transcriptExample,
  methylCExampleMOHD,
  methylCExampleENCODE,
} from "./tracks";
import { useCallback, useEffect, useRef, useState } from "react";

function DomainNav({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const domain = browserStore((s) => s.domain);
  const setDomain = browserStore((s) => s.setDomain);

  const [inputValue, setInputValue] = useState("");
  const historyRef = useRef<Domain[]>([]);
  const [historyLen, setHistoryLen] = useState(0);

  useEffect(() => {
    setInputValue(`${domain.chromosome}:${domain.start}-${domain.end}`);
  }, [domain]);

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

/**
 * A test page using BigWig tracks (Phase 1 — tracer bullet)
 */
export default function All() {
  const browserStore = createBrowserStoreMemo(
    {
      domain: { chromosome: "chr12", start: 53372922, end: 53423700 },
      marginWidth: 50,
      trackWidth: 950,
      multiplier: 3,
      highlights: [],
    },
    []
  );

  const trackStore = createTrackStoreMemo(
    [transcriptExample, bigBedExample, bigWigExample, bigWigFillZero, methylCExampleENCODE, methylCExampleMOHD],
    []
  );

  const dataStore = createDataStoreMemo([]);

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
