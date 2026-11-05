import type { BigBedRecord, BigBedSummaryRecord } from "@weng-lab/genomic-reader";
import type { standardRepeatMaskerSchema } from "./schema";
export const repeatCategories = [
  "SINE",
  "LINE",
  "LTR",
  "DNA",
  "Simple",
  "Low_complexity",
  "Satellite",
  "RNA",
  "Other",
  "Unknown",
] as const;
export type RepeatCategory = (typeof repeatCategories)[number];
export type StandardRepeatMaskerRepeat = BigBedRecord<typeof standardRepeatMaskerSchema> & {
  kind: "repeat";
  category: RepeatCategory;
};
export type StandardRepeatMaskerItem =
  | StandardRepeatMaskerRepeat
  | Pick<BigBedSummaryRecord, "kind" | "chromosome" | "start" | "end" | "validCount" | "mean">;
export type StandardRepeatMaskerData =
  | { kind: "repeats"; repeats: StandardRepeatMaskerRepeat[] }
  | { kind: "summary"; summaries: BigBedSummaryRecord[] }
  | { kind: "detail-required" };
