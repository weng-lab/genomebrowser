import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track, useTrackStore } from "./store/trackStore";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { IntitialBrowserState, useBrowserStore } from "./store/browserStore";
import { DisplayMode, TrackType } from "./components/tracks/types";
import { Vibrant } from "./utils/color";
import { create } from "zustand";
import { Transcript } from "./components/tracks/transcript/types";
import { ImportanceConfig } from "./components/tracks/importance/types";

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
      title: "Track 1",
      titleSize: 12,
      height: 100,
      color: Vibrant[6],
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
    {
      id: "2",
      title: "Track 2",
      titleSize: 12,
      height: 14,
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
    },
    {
      id: "3",
      title: "Track 3",
      titleSize: 12,
      height: 50,
      color: Vibrant[8],
      trackType: TrackType.Transcript,
      assembly: "GRCh38",
      version: 47,
      refetch: () => {},
      displayMode: DisplayMode.Squish,
      onHover: (item: Transcript) => {
        console.log(item);
        addHighlight({
          id: item.name || "dsadsfd",
          domain: { start: item.coordinates.start, end: item.coordinates.end },
          color: item.color || "blue",
        });
      },
      onLeave: (item: Transcript) => {
        console.log(item);
        removeHighlight(item.name || "dsadsfd");
      },
    },
  ];

  const initialState: IntitialBrowserState = {
    domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
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
    title: "Importance",
    titleSize: 12,
    height: 75,
    color: Vibrant[9],
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
