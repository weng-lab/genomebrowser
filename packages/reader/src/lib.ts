// Regional reading
export type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";

// BigWig signal
export { createBigWigFile } from "./bigWig";
export type {
  BigWigFile,
  BigWigFileOptions,
  BigWigRecord,
  BigWigSummaryRecord,
  BigWigValueRecord,
} from "./bigWig";

// BigBed annotations
export { bed3Schema, createBigBedFile } from "./bigBed";
export type { BigBedFile, BigBedFileOptions, BigBedRecord } from "./bigBed";
export { BigBedParseError } from "./bigBedParseError";
export type { BigBedParseContext } from "./bigBedParseError";

// TwoBit sequence
export { createTwoBitFile } from "./twoBit";
export type { TwoBitFile, TwoBitFileOptions, TwoBitRecord } from "./twoBit";

// Chromosome sizes
export { parseChromSizes, readChromSizes } from "./chromSizes";
export type { ChromSizes, ReadChromSizesOptions } from "./chromSizes";

// Cytobands
export { parseCytobands, readCytobands } from "./cytobands";
export type { Cytoband, ReadCytobandsOptions } from "./cytobands";

// BAM alignments
export { createBamFile } from "./bam";
export type {
  BamFile,
  BamFileOptions,
  BamRecord,
  BamCigarOperation,
  BamMate,
  BamHeader,
  BamReference,
} from "./bam";
