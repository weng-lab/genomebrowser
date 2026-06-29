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
    MukamelMethylC("CGE_ADARB2_ADAM33.female.old"),
    // MukamelMethylC("L2-4IT_CUX2_LINC01331.male.young"),
    // MukamelMethylC("Glia_Astro.female.young"),
    // MukamelMethylC("MGE_PVALB_COL15A1.male.old"),
    BrainomeCave("GLU", "Infancy", "#ff0000"),
    // BrainomeCave("GLU", "Early_Childhood", "#ff6f00"),
    // BrainomeCave("GLU", "Late_Childhood", "#008000"),
    // BrainomeCave("GLU", "Adolescence", "#0000ff"),
    // BrainomeCave("GLU", "Early_Adulthood", "#880088"),
    // BrainomeCave("GLU", "Adulthood", "#000000"),
  ],
});

export default function App() {
  return <GenomeBrowser browserStore={browserStore} trackStore={trackStore} />;
}
