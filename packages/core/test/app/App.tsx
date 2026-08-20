import { createBrowserStore, createTrackStore, GenomeBrowser, hg38 } from "../../src/lib";
import { testTrack, testTrackModule } from "./tracks";

const browserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
  marginWidth: 60,
  highlights: [
    {
      id: "test-highlight",
      region: { chromosome: "chr6", start: 21594500, end: 21596200 },
      color: "#f59e0b",
      opacity: 0.25,
    },
  ],
});

const trackStore = createTrackStore({
  modules: [testTrackModule],
  tracks: [testTrack],
});

export default function App() {
  return <GenomeBrowser browserStore={browserStore} trackStore={trackStore} />;
}
