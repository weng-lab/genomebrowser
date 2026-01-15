import { createBiosampleFolder } from "./shared/createFolder";
import humanData from "./data/human.json";
import { BiosampleDataFile } from "./shared/types";

/**
 * Human biosamples folder configuration for GRCh38 assembly.
 *
 * Contains epigenomic data (DNase, ATAC, H3K4me3, H3K27ac, CTCF, cCRE, RNA-seq, ChromHMM)
 * from human tissue samples, primary cells, cell lines, and organoids.
 */
export const humanBiosamplesFolder = createBiosampleFolder({
  id: "human-biosamples",
  label: "Human Biosamples",
  data: humanData as BiosampleDataFile,
});

export const humanBiosamplesFolder2 = createBiosampleFolder({
  id: "human-biosamples-2",
  label: "Human Biosamples 2",
  data: humanData as BiosampleDataFile,
});
