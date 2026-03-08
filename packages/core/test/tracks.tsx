import { createBigWigTrack, Vibrant } from "../src/lib";

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
