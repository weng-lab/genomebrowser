import type { BigBedRecord, BigBedSummaryRecord } from "@weng-lab/genomic-reader";
import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { bigRmskSchema } from "./schema";

export type BigRmskRepeat = BigBedRecord<typeof bigRmskSchema> & {
  repeatName: string;
  repeatClass: string;
  repeatFamily: string;
  alignedBlocks: GenomicRegion[];
};

export type BigRmskData = BigRmskRepeat[];

export type BigRmskSummaryItem = Pick<
  BigBedSummaryRecord,
  "chromosome" | "start" | "end" | "validCount" | "mean"
> & {
  kind: "joined-summary";
};
export type BigRmskSummaryData =
  | { kind: "summary"; summaries: BigBedSummaryRecord[] }
  | { kind: "detail-required" };
