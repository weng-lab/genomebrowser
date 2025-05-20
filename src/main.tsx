import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track } from "./store/trackStore";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { IntitialBrowserState, useBrowserStore } from "./store/browserStore";
import { DisplayMode, TrackType } from "./components/tracks/types";
import { useTheme } from "./store/themeStore";
import { Vibrant } from "./utils/color";

const client = new ApolloClient({
  uri: "https://ga.staging.wenglab.org/graphql",
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

function Main() {
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
      height: 50,
      color: Vibrant[7],
      trackType: TrackType.BigBed,
      displayMode: DisplayMode.Dense,
      url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      rowHeight: 20,
      onClick: (rect) => {
        console.log(rect);
      },
      onMouseOver: (rect) => {
        console.log(rect);
      },
      onMouseOut: (rect) => {
        console.log(rect);
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
      rowHeight: 12,
    },
  ];

  const initialState: IntitialBrowserState = {
    domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
    marginWidth: 150,
    trackWidth: 1350,
    multiplier: 3,
  };

  const setBackground = useTheme((state) => state.setBackground);
  useEffect(() => {
    setBackground("#252525");
  }, []);

  return (
    <div>
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
  return (
    <div>
      {domain.chromosome}:{domain.start}-{domain.end}
    </div>
  );
}

function Action() {
  // const editTrack = useTrackStore((state) => state.editTrack);
  const setDomain = useBrowserStore((state) => state.setDomain);
  const setBackground = useTheme((state) => state.setBackground);

  const onClick = () => {
    // const height = Math.random() * 100 + 50;
    // editTrack<BigWigConfig>("2", { height: height });
    // setDomain({ chromosome: "chr18", start: 35482597, end: 35501745 });
    setBackground("#AEA4BF");
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
