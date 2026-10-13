"use client";

import { createBrowserStore, createTrackStore, GenomeBrowser, hg38 } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { testTrack, testTrackModule } from "./tracks";
import "./styles.css";

const useBrowserStore = createBrowserStore({
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

const useTrackStore = createTrackStore({
  modules: [rulerModule, testTrackModule],
  tracks: [
    rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} }),
    testTrack,
  ],
});

export default function App() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
