import {
  BigBedConfig,
  BigWigConfig,
  BulkBedConfig,
  DisplayMode,
  ImportanceConfig,
  LDTrackConfig,
  ManhattanTrackConfig,
  MethylCConfig,
  MotifConfig,
  Rect,
  TrackType,
  TranscriptConfig,
  Vibrant,
} from "../src/lib";
import React from "react";

export const bigWigExample: BigWigConfig = {
  id: "1",
  title: "bigWig",
  height: 100,
  color: Vibrant[6],
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
};

export const bigBedExample: BigBedConfig = {
  id: "2",
  title: "bigBed",
  height: 20,
  color: Vibrant[7],
  trackType: TrackType.BigBed,
  displayMode: DisplayMode.Dense,
  url: "https://downloads.wenglab.org/igscreen/iCREs.bigBed",
  // url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  tooltip: (rect: Rect) => {
    return (
      <g>
        <text>{rect.name}</text>
      </g>
    );
  },
};

export const transcriptExample: TranscriptConfig = {
  id: "3",
  title: "genes",
  height: 50,
  color: "#0c184a",
  trackType: TrackType.Transcript,
  assembly: "GRCh38",
  version: 47,
  displayMode: DisplayMode.Squish,
  canonicalColor: "#0098db",
  highlightColor: "#ff0000",
  geneName: "APOC1",
};

export const motifExample: MotifConfig = {
  id: "4",
  title: "motif",
  titleSize: 12,
  height: 100,
  color: Vibrant[1],
  peakColor: Vibrant[3],
  trackType: TrackType.Motif,
  displayMode: DisplayMode.Squish,
  assembly: "GRCh38",
  consensusRegex: "gcca[cg][ct]ag[ag]gggcgc",
  peaksAccession: "ENCFF992CTF",
  onHover: (rect) => {
    console.log(rect);
  },
  onLeave: (rect) => {
    console.log(rect);
  },
};

export const importanceExample: ImportanceConfig = {
  id: "importance",
  title: "importance",
  titleSize: 12,
  height: 75,
  color: Vibrant[0],
  trackType: TrackType.Importance,
  url: "https://downloads.wenglab.org/hg38.2bit",
  displayMode: DisplayMode.Full,
  signalURL: "https://downloads.wenglab.org/hg38.phyloP100way.bigWig",
};

export const bulkBedExample: BulkBedConfig = {
  id: "5",
  title: "bulk BigBed",
  titleSize: 12,
  height: 30,
  gap: 2,
  color: Vibrant[2],
  trackType: TrackType.BulkBed,
  displayMode: DisplayMode.Full,
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
  tooltip: (rect) => {
    return (
      <g>
        <rect width={160} height={45} fill="white" stroke="none" filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.2))" />
        <text x={10} y={20} fontSize={12} fontWeight="bold">
          {rect.name}
        </text>
        <text x={10} y={35} fontSize={12}>
          {rect.datasetName}
        </text>
      </g>
    );
  },
} as BulkBedConfig;

export const methylCTrack: MethylCConfig = {
  id: "methylC",
  trackType: TrackType.MethylC,
  displayMode: DisplayMode.Split,
  title: "MethylC Track",
  titleSize: 12,
  height: 100,
  color: "#000000",
  colors: {
    cpg: "#648bd8", // rgb(100, 139, 216)
    chg: "#ff944d", // rgb(255, 148, 77)
    chh: "#ff00ff", // rgb(25, 14, 25)
    depth: "#525252", // rgb(82, 82, 82)
  },
  urls: {
    plusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_pos.bw" },
      chg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_pos.bw" },
      chh: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_pos.bw" },
      depth: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_pos.bw" },
    },
    minusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_cpg_neg.bw" },
      chg: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chg_neg.bw" },
      chh: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_chh_neg.bw" },
      depth: { url: "https://users.wenglab.org/mezaj/mohd/EB100001/EB100001_coverage_neg.bw" },
    },
  },
};

export const bigWig: BigWigConfig = {
  id: "bigWig",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  title:
    "Homo sapiens activated naive CD4-positive, alpha-beta T cell male adult (43 years) treated with anti-CD3 and anti-CD28 coated beads for 36 hours, 10 ng/mL Interleukin-2 for 5 days",
  titleSize: 12,
  height: 100,
  color: "#000000",
  url: "https://users.wenglab.org/sheddn/igSCREEN_RNA/ENCSR152FDX-CD4_Tcells.bw",
};

export const phyloP: BigWigConfig = {
  id: "phyloP",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full,
  title: "PhyloP Track",
  titleSize: 12,
  height: 100,
  color: "#000000",
  customRange: { min: -2, max: 8 },
  url: "https://downloads.wenglab.org/hg38.phyloP100way.bw",
};

export const ldTrack: LDTrackConfig = {
  id: "ld",
  title: "LD",
  trackType: TrackType.LDTrack,
  displayMode: DisplayMode.GenericLD,
  height: 50,
  titleSize: 12,
  color: "#ff0000",
  showScore: false,
};

export const manhattanTrack: ManhattanTrackConfig = {
  id: "manhattan",
  title: "Manhattan",
  trackType: TrackType.Manhattan,
  displayMode: DisplayMode.Scatter,
  height: 75,
  titleSize: 12,
  color: "#ff0000",
  cutoffLabel: "5e-8",
};
