import {
  createBigWigTrack,
  createBigBedTrack,
  createImportanceTrack,
  createMotifTrack,
  createTranscriptTrack,
  createMethylCTrack,
  createBulkBedTrack,
  Vibrant,
} from "../src/lib";

export const bigWigExample = createBigWigTrack({
  id: "1",
  title: "bigWig",
  url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
  height: 100,
  color: Vibrant[6],
  displayMode: "full",
});

export const bigWig = createBigWigTrack({
  id: "bigWig",
  title:
    "Homo sapiens activated naive CD4-positive, alpha-beta T cell male adult (43 years) treated with anti-CD3 and anti-CD28 coated beads for 36 hours, 10 ng/mL Interleukin-2 for 5 days",
  url: "https://users.wenglab.org/sheddn/igSCREEN_RNA/ENCSR152FDX-CD4_Tcells.bw",
  height: 100,
  titleSize: 12,
  color: "#000000",
});

export const phyloP = createBigWigTrack({
  id: "phyloP",
  title: "PhyloP Track",
  url: "https://downloads.wenglab.org/hg38.phyloP100way.bw",
  height: 100,
  titleSize: 12,
  color: "#000000",
  customRange: { min: -2, max: 8 },
});

export const bigWigFillZero = createBigWigTrack({
  id: "bigWigFillZero",
  title: "BigWig (fillWithZero)",
  url: "https://downloads.wenglab.org/Registry-V4/ENCFF470BSF.bigWig",
  height: 100,
  color: Vibrant[4],
  fillWithZero: true,
});

export const bigBedExample = createBigBedTrack({
  id: "bigbed",
  title: "bigBed",
  url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
  height: 20,
  color: Vibrant[7],
  displayMode: "dense",
});

export const transcriptExample = createTranscriptTrack({
  id: "transcript",
  title: "GENCODE Genes",
  assembly: "GRCh38",
  version: 40,
  height: 100,
  color: "#0c184a",
  canonicalColor: "#100e98",
  highlightColor: "#3c69e8",
  titleSize: 12,
  displayMode: "squish",
});

export const motifExample = createMotifTrack({
  id: "motif",
  title: "motif",
  titleSize: 12,
  height: 100,
  color: Vibrant[1],
  peakColor: Vibrant[3],
  displayMode: "squish",
  assembly: "GRCh38",
  consensusRegex: "gcca[cg][ct]ag[ag]gggcgc",
  peaksAccession: "ENCFF992CTF",
  onHover: (rect) => {
    console.log(rect);
  },
  onLeave: (rect) => {
    console.log(rect);
  },
});

export const importanceExample = createImportanceTrack({
  id: "importance",
  title: "importance",
  titleSize: 12,
  height: 75,
  color: Vibrant[0],
  url: "https://downloads.wenglab.org/hg38.2bit",
  displayMode: "full",
  signalURL: "https://downloads.wenglab.org/hg38.phyloP100way.bigWig",
});

export const methylCExampleENCODE = createMethylCTrack({
  id: "methylCEncode",
  title: "MethylC ENCODE",
  height: 100,
  titleSize: 12,
  displayMode: "split",
  color: "#648bd8",
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
  urls: {
    plusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/wgbs/ENCFF479QRW.bigWig" },
      chg: { url: "" },
      chh: { url: "" },
      depth: { url: "https://users.wenglab.org/mezaj/wgbs/ENCFF698UYM.bigWig" },
    },
    minusStrand: {
      cpg: { url: "https://users.wenglab.org/mezaj/wgbs/ENCFF829YYQ.bigWig" },
      chg: { url: "" },
      chh: { url: "" },
      depth: { url: "https://users.wenglab.org/mezaj/wgbs/ENCFF698UYM.bigWig" },
    },
  },
});

export const methylCExampleMOHD = createMethylCTrack({
  id: "methylCMohd",
  title: "WGBS MethylC MOHD",
  height: 100,
  titleSize: 12,
  displayMode: "split",
  color: "#648bd8",
  colors: {
    cpg: "#648bd8",
    chg: "#ff944d",
    chh: "#ff00ff",
    depth: "#525252",
  },
  range: {
    max: 1,
    min: 0,
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
});

export const bulkBedExample = createBulkBedTrack({
  id: "bulkbed",
  title: "Bulk cCREs",
  height: 80,
  titleSize: 12,
  displayMode: "full",
  color: Vibrant[7],
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
});
