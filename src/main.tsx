import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { Track, useTrackStore } from "./store/trackStore";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { IntitialBrowserState } from "./store/browserStore";
import { DisplayMode, TrackType } from "./components/tracks/types";
import { BigWigConfig } from "./components/tracks/bigwig/types";

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
      color: "#ffadad",
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
    {
      id: "2",
      title: "Track 2",
      titleSize: 12,
      height: 50,
      color: "#adffad",
      trackType: TrackType.BigBed,
      displayMode: DisplayMode.Dense,
      url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      rowHeight: 20,
    },
  ];

  const initialState: IntitialBrowserState = {
    domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
    marginWidth: 150,
    trackWidth: 1350,
  };

  return (
    <div>
      <Action />
      <ApolloProvider client={client}>
        {/* <div
          style={{
            width: "50%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        > */}
        <Browser state={initialState} tracks={tracks} />
        {/* </div> */}
      </ApolloProvider>
    </div>
  );
}

function Action() {
  const editTrack = useTrackStore((state) => state.editTrack);

  const onClick = () => {
    const height = Math.random() * 100 + 50;
    editTrack<BigWigConfig>("2", { height: height });
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
