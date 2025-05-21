import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track } from "./store/trackStore";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { IntitialBrowserState, useBrowserStore } from "./store/browserStore";
import { DisplayMode, TrackType } from "./components/tracks/types";
import { useTheme } from "./store/themeStore";
import { Vibrant } from "./utils/color";
import { create } from "zustand";
import { Rect } from "./components/tracks/bigbed/types";
import { Transcript } from "./components/tracks/transcript/types";
import { BigWigData } from "./components/tracks/bigwig/types";

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

  const TT = (value: BigWigData | Rect | Transcript) => {
    const textRef = useRef<SVGTextElement>(null);
    const [width, setWidth] = useState(0);
    const { text, background } = useTheme();

    let content = "";
    if ("value" in value) {
      content = value.value.toFixed(2);
    }
    if ("name" in value) {
      content = value.name || "";
    }

    useEffect(() => {
      if (textRef.current) {
        const width = textRef.current.getBBox().width;
        setWidth(width);
      }
    }, [value, textRef.current, setWidth]);

    return (
      <g style={{ filter: `drop-shadow(0 0 2px ${text})` }}>
        <rect rx={2} y={-15} width={width + 10} height={20} fill={background} />
        <text ref={textRef} x={5} y={0} fill={text}>
          {content}
        </text>
      </g>
    );
  };

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
      tooltip: TT,
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
      },
      onHover: (rect) => {
        setName(rect.name + " hovered");
      },
      onLeave: () => {
        setName("...");
      },
      tooltip: TT,
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
      tooltip: TT,
    },
  ];

  const initialState: IntitialBrowserState = {
    domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
    marginWidth: 150,
    trackWidth: 1350,
    multiplier: 3,
  };

  return (
    <div style={{ width: "90%" }}>
      <Action />
      <DomainView />
      <ApolloProvider client={client}>
        <Browser state={initialState} tracks={tracks} />
      </ApolloProvider>
    </div>
  );
}

function DomainView() {
  const domain = useBrowserStore((state) => state.domain);
  const name = useStore((state) => state.name);
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
  // const editTrack = useTrackStore((state) => state.editTrack);
  const setBackground = useTheme((state) => state.setBackground);

  const onClick = () => {
    // const height = Math.random() * 100 + 50;
    // editTrack<BigWigConfig>("2", { height: height });
    // setDomain({ chromosome: "chr18", start: 35482597, end: 35501745 });
    setBackground("#000");
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
