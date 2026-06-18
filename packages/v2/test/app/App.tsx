import {
  GenomeBrowser,
  createBrowserStore,
  bigBedModule,
  bulkBedModule,
  bigWigModule,
  createTrackStore,
  methylCModule,
  transcriptModule,
} from "../../src/lib";

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
    bigWigModule.create({
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
        console.log("[v2 test app] BigBed click", {
          name: item.name,
          start: item.start,
          end: item.end,
          item,
        });
      },
    }),
    bulkBedModule.create({
      id: "chip-bulk-peaks",
      title: "bulk BigBed",
      color: "#db6d28",
      height: 30,
      gap: 2,
      datasets: [
        {
          name: "ChIP Dataset 1",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000AKA-ENCSR000AKC-ENCSR000AKF-ENCSR000AKE-ENCSR000AKD-ENCSR000AOX.bigBed",
        },
        {
          name: "ChIP Dataset 2",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000EWA-ENCSR000AKP-ENCSR000EWC-ENCSR000DWB-ENCSR000EWB-ENCSR000APE.bigBed",
        },
        {
          name: "ChIP Dataset 3",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000ARA-ENCSR000AQW-ENCSR000AQY-ENCSR000AQX-ENCSR000ASX-ENCSR000ARZ.bigBed",
        },
      ],
      onClick: ({ item }) => {
        console.log("[v2 test app] BulkBed click", {
          name: item.name,
        });
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
    methylCModule.create({
      id: "methylc",
      title: "MethylC Track",
      height: 100,
      colors: {
        cpg: "#648bd8",
        chg: "#ff944d",
        chh: "#ff00ff",
        depth: "#525252",
      },
      range: { min: 0, max: 1 },
      urls: {
        plusStrand: {
          cpg: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_pos.bw",
          },
          chg: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_pos.bw",
          },
          chh: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_pos.bw",
          },
          depth: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_pos.bw",
          },
        },
        minusStrand: {
          cpg: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_neg.bw",
          },
          chg: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_neg.bw",
          },
          chh: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_neg.bw",
          },
          depth: {
            url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_neg.bw",
          },
        },
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
    />
  );
}
