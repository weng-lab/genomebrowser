import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import {
  Browser,
  BulkBedRect,
  DisplayMode,
  ImportanceConfig,
  Rect,
  Track,
  TrackType,
  Transcript,
  useTrackStore,
} from "./lib";
import { InitialBrowserState, useBrowserStore } from "./store/browserStore";
import { Vibrant } from "./utils/color";
import { bigBedExample, bigWigExample, bulkBedExample, motifExample, transcriptExample } from "./tracks";

const useStore = create<{ name: string; setName: (name: string) => void }>((set) => ({
  name: "test",
  setName: (name: string) => set({ name }),
}));

function Main() {
  const setName = useStore((state) => state.setName);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const removeHighlight = useBrowserStore((state) => state.removeHighlight);

  const tracks: Track[] = [
    bigWigExample,
    {
      ...bigBedExample,
      onHover: (rect: Rect) => {
        setName(rect.name + " hovered");
        addHighlight({
          id: rect.name || "ihqoviun",
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "blue",
        });
      },
      onLeave: (rect: Rect) => {
        setName(rect.name + " left");
        removeHighlight(rect.name || "ihqoviun");
      },
    },
    {
      ...transcriptExample,
      onHover: (item: Transcript) => {
        addHighlight({
          id: item.name || "dsadsfd",
          domain: { start: item.coordinates.start, end: item.coordinates.end },
          color: item.color || "blue",
        });
      },
      onLeave: (item: Transcript) => {
        removeHighlight(item.name || "dsadsfd");
      },
    },
    motifExample,
    {
      ...bulkBedExample,
      onClick: (rect: BulkBedRect) => {
        const id = (rect.name || "bulk-clicked") + "-clicked";
        addHighlight({
          id,
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "orange",
        });
      },
      onHover: (rect: BulkBedRect) => {
        addHighlight({
          id: rect.name || "bulk-hover",
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "orange",
        });
      },
      onLeave: (rect: BulkBedRect) => {
        removeHighlight(rect.name || "bulk-hover");
      },
    },
    {
      ...bulkBedExample,
      id: "dsfgh",
      datasets: [
        {
          name: "ChIP Dataset 2",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000EWA-ENCSR000AKP-ENCSR000EWC-ENCSR000DWB-ENCSR000EWB-ENCSR000APE.bigBed",
        },
        {
          name: "ChIP Dataset 3",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000ARA-ENCSR000AQW-ENCSR000AQY-ENCSR000AQX-ENCSR000ASX-ENCSR000ARZ.bigBed",
        },
        {
          name: "ChIP Dataset 1",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000AKA-ENCSR000AKC-ENCSR000AKF-ENCSR000AKE-ENCSR000AKD-ENCSR000AOX.bigBed",
        },
      ],
    },
  ];

  const initialState: InitialBrowserState = {
    // chr12:53,380,037-53,380,206
    domain: { chromosome: "chr12", start: 53380037 - 20000, end: 53380206 + 20000 },
    marginWidth: 100,
    trackWidth: 1400,
    multiplier: 3,
    highlights: [
      { id: "1", color: "#ffaabb", domain: { chromosome: "chr18", start: 35496000, end: 35502000 } },
      { id: "2", color: "#aaffbb", domain: { chromosome: "chr18", start: 35494852, end: 35514000 } },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Action />
      <DomainView />
      <div style={{ width: "90%" }}>
        <Browser state={initialState} tracks={tracks} />
      </div>
    </div>
  );
}

function DomainView() {
  const domain = useBrowserStore((state) => state.domain);
  const name = useStore((state) => state.name);
  const insertTrack = useTrackStore((state) => state.insertTrack);
  const removeTrack = useTrackStore((state) => state.removeTrack);

  const importanceTrack: ImportanceConfig = {
    id: "importance",
    title: "importance",
    titleSize: 12,
    height: 75,
    color: Vibrant[0],
    trackType: TrackType.Importance,
    url: "gs://gcp.wenglab.org/hg38.2bit",
    displayMode: DisplayMode.Full,
    signalURL: "gs://gcp.wenglab.org/hg38.phyloP100way.bigWig",
  };

  useEffect(() => {
    if (domain.end - domain.start <= 2000) {
      insertTrack(importanceTrack);
    } else {
      removeTrack("importance");
    }
  }, [domain]);

  return (
    <div>
      <div>{name}</div>
      <div>
        {domain.chromosome}:{domain.start}-{domain.end}
      </div>
    </div>
  );
}

function Action() {
  const setDomain = useBrowserStore((state) => state.setDomain);

  const onClick = () => {
    setDomain({ chromosome: "chr18", start: 35500000, end: 35502000 });
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
