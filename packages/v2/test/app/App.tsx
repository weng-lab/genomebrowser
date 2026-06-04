import {
  GenomeBrowser,
  createBrowserStore,
  bigBedModule,
  createTrackStore,
  transcriptModule,
} from "../../src/lib";
import { demoBigWigModule, demoSettingsStore } from "./customSettings";

const browserStore = createBrowserStore({
  region: "chr6:21,592,778-21,599,592",
});

const modules = [demoBigWigModule, bigBedModule, transcriptModule];

const trackStore = createTrackStore({
  modules,
  tracks: [
    demoBigWigModule.create({
      id: "dnase",
      title: "DNase aggregate",
      color: "#1B2021",
      height: 50,
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    }),
    bigBedModule.create({
      id: "astro-peaks",
      title: "Astro peaks",
      color: "#4b9560",
      display: "squish",
      height: 35,
      url: "https://downloads.wenglab.org/Astro.PeakCalls.bb",
      onClick: ({ item }) => {
        console.log(item);
      },
    }),
    transcriptModule.create({
      id: "genes",
      title: "Genes",
      assembly: "GRCh38",
      version: 40,
      geneName: "SOX4",
      display: "pack",
      color: "#7a4fb3",
      canonicalColor: "#d45c2f",
      highlightColor: "#1f77b4",
      height: 35,
      onClick: ({ item }) => {
        console.log(item.name);
      },
    }),
  ],
});

export default function App() {
  return (
    <GenomeBrowser
      browserStore={browserStore}
      trackStore={trackStore}
      modules={modules}
      settingsStore={demoSettingsStore}
    />
  );
}
