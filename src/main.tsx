import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import { Browser, BulkBedConfig, DisplayMode, ImportanceConfig, Track, TrackType, Transcript, useTrackStore } from "./lib";
import { InitialBrowserState, useBrowserStore } from "./store/browserStore";
import { Vibrant } from "./utils/color";

const client = new ApolloClient({
  uri: "https://ga.staging.wenglab.org/graphql",
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

const useStore = create<{ name: string; setName: (name: string) => void }>((set) => ({
  name: "test",
  setName: (name: string) => set({ name }),
}));

function Main() {
  const setName = useStore((state) => state.setName);
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const removeHighlight = useBrowserStore((state) => state.removeHighlight);

  const tracks: Track[] = [
    {
      id: "1",
      title: "bigWig",
      titleSize: 12,
      height: 100,
      color: Vibrant[6],
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
    {
      id: "2",
      title: "bigBed",
      titleSize: 12,
      height: 20,
      color: Vibrant[7],
      trackType: TrackType.BigBed,
      displayMode: DisplayMode.Dense,
      url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      onClick: (rect) => {
        setName(rect.name + " clicked");
        const id = (rect.name || "ihqoviun") + "-clicked";
        addHighlight({
          id,
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "blue",
        });
      },
      onHover: (rect) => {
        setName(rect.name + " hovered");
        addHighlight({
          id: rect.name || "ihqoviun",
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "blue",
        });
      },
      onLeave: (rect) => {
        setName(rect.name + " left");
        removeHighlight(rect.name || "ihqoviun");
      },
      tooltip: (rect) => {
        return (
          <g>
            <text>
              {rect.name}
            </text>
          </g>
        );
      },
    },
    {
      id: "3",
      title: "genes",
      titleSize: 12,
      height: 50,
      color: Vibrant[8],
      trackType: TrackType.Transcript,
      assembly: "GRCh38",
      version: 47,
      displayMode: DisplayMode.Squish,
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
    {
      id: "4",
      title: "motif",
      titleSize: 12,
      height: 100,
      color: Vibrant[1],
      peakColor: Vibrant[3],
      trackType: TrackType.Motif,
      displayMode: DisplayMode.Squish,
      assembly: "GRCh38",
      consensusRegex: "gcca[cg][ct]ag[ag]gggcgc",
      peaksAccession: "ENCFF992CTF",
      onHover: (rect) => {
        console.log(rect);
      },
      onLeave: (rect) => {
        console.log(rect);
      },
    },
    {
      id: "5",
      title: "bulk BigBed",
      titleSize: 12,
      height: 30,
      gap: 2,
      color: Vibrant[2],
      trackType: TrackType.BulkBed,
      displayMode: DisplayMode.Full,
      urls: [
        "https://downloads.wenglab.org/ChIP_ENCSR000AKA-ENCSR000AKC-ENCSR000AKF-ENCSR000AKE-ENCSR000AKD-ENCSR000AOX.bigBed",
        "https://downloads.wenglab.org/ChIP_ENCSR000EWA-ENCSR000AKP-ENCSR000EWC-ENCSR000DWB-ENCSR000EWB-ENCSR000APE.bigBed",
        "https://downloads.wenglab.org/ChIP_ENCSR000ARA-ENCSR000AQW-ENCSR000AQY-ENCSR000AQX-ENCSR000ASX-ENCSR000ARZ.bigBed"
      ],
      onClick: (rect) => {
        const id = (rect.name || "bulk-clicked") + "-clicked";
        addHighlight({
          id,
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "orange",
        });
      },
      onHover: (rect) => {
        addHighlight({
          id: rect.name || "bulk-hover",
          domain: { start: rect.start, end: rect.end },
          color: rect.color || "orange",
        });
      },
      onLeave: (rect) => {
        removeHighlight(rect.name || "bulk-hover");
      },
      tooltip: (rect) => {
        return (
          <g>
            <rect width={100} height={100} fill="red" />
            <text x={0} y={0}>This is {rect.name}</text>
          </g>
        )
      }
    } as BulkBedConfig,
  ];

  const initialState: InitialBrowserState = {
    // chr12:53,380,037-53,380,206
    domain: { chromosome: "chr12", start: 53380037 - 20000, end: 53380206 + 20000 },
    marginWidth: 150,
    trackWidth: 1350,
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
      <ApolloProvider client={client}>
        <div style={{ width: "90%" }}>
          <Browser state={initialState} tracks={tracks} />
        </div>
      </ApolloProvider>
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
