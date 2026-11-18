import type { BigBedRecord } from "@weng-lab/genomic-reader";
import type { haploSchema, triploSchema, geneDiseaseSchema, cspecSchema } from "./schema";

export type ClinGenItem = (
  | (BigBedRecord<typeof haploSchema> & { kind: "haplo" })
  | (BigBedRecord<typeof triploSchema> & { kind: "triplo" })
  | (BigBedRecord<typeof geneDiseaseSchema> & { kind: "gene-disease" })
  | (BigBedRecord<typeof cspecSchema> & { kind: "cspec" })
) & { color: string };

export type ClinGenKind = ClinGenItem["kind"];
export type ClinGenData = { kind: "features"; items: ClinGenItem[] } | { kind: "detail-required" };
export type ClinGenDisplay = "dense" | "pack" | "full";
