import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Browser from "./components/browser/browser";
import { DisplayMode, Track, TrackType, useTrackStore } from "./store/trackStore";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { IntitialBrowserState } from "./store/browserStore";

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
      height: 100,
      color: "#adffad",
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
    {
      id: "3",
      title: "Track 3",
      titleSize: 12,
      height: 100,
      color: "#adadff",
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
  ];

  const initialState: IntitialBrowserState = {
    domain: { chromosome: "chr18", start: 35494852, end: 35514000 },
    marginWidth: 125,
    trackWidth: 1375,
  };

  return (
    <div>
      <Action />
      <ApolloProvider client={client}>
        <Browser state={initialState} tracks={tracks} />
      </ApolloProvider>
    </div>
  );
}

function Action() {
  const updateTrack = useTrackStore((state) => state.updateTrack);

  const onClick = () => {
    const max = Math.random() * 100;
    // const height = Math.random() * 100 + 50;
    updateTrack("1", "range", { min: 0, max });
    // updateTrack("2", "height", height);
  };

  return <button onClick={onClick}>Click for action</button>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
