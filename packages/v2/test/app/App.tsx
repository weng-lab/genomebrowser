import {
  createBrowserStore,
  bigBedModule,
  bulkBedModule,
  caveModule,
  bigWigModule,
  createTrackStore,
  methylCModule,
  transcriptModule,
  GenomeBrowser,
} from "../../src/lib";
import {
  bigBedExample,
  bigWigExample,
  BrainomeCave,
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
  caveModule,
];

const trackStore = createTrackStore({
  modules,
  tracks: [
    bigWigExample,
    bigBedExample,
    transcriptExample,
    MukamelMethylC("CGE_ADARB2_ADAM33"),
    MukamelMethylC("MGE_SST_RAB31.young"),
    MukamelMethylC("CGE_VIP_FGD5.old"),
    // BrainomeBigwig("GLU", "BS", "Adulthood"),
    // BrainomeBigwig("GLU", "OXBS", "Adulthood"),
    // BrainomeBigwig("GLU", "hmC", "Adulthood"),
    BrainomeCave("GLU", "Infancy"),
    BrainomeCave("GLU", "Early_Childhood"),
    BrainomeCave("GLU", "Late_Childhood"),
    BrainomeCave("GLU", "Adolescence"),
    BrainomeCave("GLU", "Early_Adulthood"),
    BrainomeCave("GLU", "Adulthood"),
  ],
});

export default function App() {
  return <GenomeBrowser browserStore={browserStore} trackStore={trackStore} />;
}
