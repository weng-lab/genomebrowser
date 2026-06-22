import {
  createBrowserStore,
  bigBedModule,
  bulkBedModule,
  bigWigModule,
  createTrackStore,
  methylCModule,
  transcriptModule,
} from "../../src/lib";
import { GenomeBrowser } from "../../src_new/lib";
import {
  bigBedExample,
  bigWigExample,
  MukamelMethylC,
  transcriptExample,
} from "./tracks";

const browserStore = createBrowserStore({
  region: "chr12:53,372,922-53,423,700",
  highlights: [
    {
      id: "test-highlight",
      region: { chromosome: "chr6", start: 21594500, end: 21596200 },
      color: "#f59e0b",
      opacity: 0.25,
    },
  ],
});

const modules = [
  bigWigModule,
  bigBedModule,
  transcriptModule,
  bulkBedModule,
  methylCModule,
];

const trackStore = createTrackStore({
  modules,
  tracks: [
    bigWigExample,
    bigBedExample,
    transcriptExample,
    MukamelMethylC("CGE_ADARB2_ADAM33"),
    MukamelMethylC("MGE_SST_RAB31.young"),
  ],
});

export default function App() {
  return (
    <GenomeBrowser
      browserStore={browserStore}
      trackStore={trackStore}
      modules={modules}
    />
  );
}
