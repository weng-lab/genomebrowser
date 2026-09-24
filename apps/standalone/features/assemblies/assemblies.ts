import type { GenomicRegion } from "@weng-lab/genomebrowser";
import { hg38, mm10, type AssemblyDefinition } from "@weng-lab/genomebrowser/genome";
import {
  getGeneDatasetsForAssembly,
  type GeneDataset,
} from "@weng-lab/genomebrowser-tracks/gene-datasets";

export type AssemblyConfig = {
  definition: AssemblyDefinition;
  label: string;
  initialRegion: GenomicRegion;
  reference: { sequenceUrl?: string; genes: readonly GeneDataset[]; defaultGeneDatasetId: string };
  search: { assembly: "GRCh38" | "mm10"; queries: ("Gene" | "SNP" | "cCRE" | "Coordinate")[] };
};

export const assemblies: readonly AssemblyConfig[] = [
  {
    definition: hg38,
    label: "Human · GRCh38 / hg38",
    initialRegion: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
    reference: {
      sequenceUrl: "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit",
      genes: getGeneDatasetsForAssembly("hg38"),
      defaultGeneDatasetId: "gencode-v40-comprehensive",
    },
    search: { assembly: "GRCh38", queries: ["Gene", "SNP", "cCRE", "Coordinate"] },
  },
  {
    definition: mm10,
    label: "Mouse · GRCm38 / mm10",
    initialRegion: { chromosome: "chr1", start: 3_000_000, end: 3_100_000 },
    reference: {
      genes: getGeneDatasetsForAssembly("mm10"),
      defaultGeneDatasetId: "gencode-vM25-comprehensive",
    },
    search: { assembly: "mm10", queries: ["Coordinate"] },
  },
];

/** Collection of the assembly's reference gene datasets. Its entries share these base settings. */
export const referenceCollectionId = "reference-annotations";
export const referenceGeneTrackBase = { display: "merged", height: 60, color: "#444444" } as const;

export function getAssembly(id: string) {
  return assemblies.find(({ definition }) => definition.id === id);
}

export const defaultAssembly = assemblies[0];
