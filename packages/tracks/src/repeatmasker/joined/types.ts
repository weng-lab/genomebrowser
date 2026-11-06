import type { BigBedRecord } from "@weng-lab/genomic-reader";
import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { bigRmskSchema } from "./schema";

export type BigRmskRepeat = BigBedRecord<typeof bigRmskSchema> & {
  repeatName: string;
  repeatClass: string;
  repeatFamily: string;
  alignedBlocks: GenomicRegion[];
};

export type BigRmskData = BigRmskRepeat[];
