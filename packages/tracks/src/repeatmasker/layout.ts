import type { BigBedMetadata } from "@weng-lab/genomic-reader";
import { bigRmskSchema } from "./joined/schema";
import { standardRepeatMaskerSchema } from "./standard/schema";

export function validateRepeatMaskerLayout(metadata: BigBedMetadata, view: "standard" | "joined") {
  const standard = view === "standard";
  const fieldCount = standard ? 17 : 14;
  const definedFieldCount = standard ? 6 : 9;
  const layout = standard ? "UCSC BED6+11" : "bigRmsk BED9+5";
  if (metadata.fieldCount !== fieldCount || metadata.definedFieldCount !== definedFieldCount)
    throw new Error(
      `RepeatMasker requires the ${layout} layout (${fieldCount} fields, ${definedFieldCount} standard BED fields).`,
    );
  if (metadata.autoSql === undefined) return;
  const schema = standard ? standardRepeatMaskerSchema : bigRmskSchema;
  const expectedNames = ["chrom", "chromStart", "chromEnd", ...Object.keys(schema.shape)];
  const text = metadata.autoSql.replace(/"(?:\\.|[^"\\])*"/g, "");
  const names = [
    ...text.matchAll(/\b(?:uint|int|string|lstring|char)(?:\s*\[\s*\w+\s*\])?\s+(\w+)\s*;/g),
  ].map((match) => match[1]);
  if (
    names.length !== expectedNames.length ||
    names.some((name, index) => name !== expectedNames[index])
  )
    throw new Error(
      `RepeatMasker AutoSQL columns do not match the expected ${standard ? "UCSC rmsk" : "bigRmsk"} schema.`,
    );
}
