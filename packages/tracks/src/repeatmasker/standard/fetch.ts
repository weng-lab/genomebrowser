import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { getCachedBigBedFile } from "../../shared/cachedFiles";
import { standardRepeatMaskerSchema, type StandardRepeatMaskerConfig } from "./schema";
import { repeatCategory } from "./presentation";
import type { StandardRepeatMaskerData } from "./types";

const expectedNames = [
  "chrom",
  "chromStart",
  "chromEnd",
  ...Object.keys(standardRepeatMaskerSchema.shape),
];
function validateLayout(metadata: {
  fieldCount: number;
  definedFieldCount: number;
  autoSql?: string;
}) {
  if (metadata.fieldCount !== 17 || metadata.definedFieldCount !== 6)
    throw new Error(
      "RepeatMasker requires the UCSC BED6+11 layout (17 fields, 6 standard BED fields).",
    );
  if (metadata.autoSql) {
    const text = metadata.autoSql.replace(/"(?:\\.|[^"\\])*"/g, "");
    const names = [
      ...text.matchAll(/\b(?:uint|int|string|lstring|char(?:\[\d+\])?)\s+(\w+)\s*;/g),
    ].map((match) => match[1]);
    if (
      names.length !== expectedNames.length ||
      names.some((name, index) => name !== expectedNames[index])
    )
      throw new Error("RepeatMasker AutoSQL columns do not match the expected UCSC rmsk schema.");
  }
}

export async function fetchStandardRepeatMasker({
  track,
  demand: { region, width },
  resources,
  signal,
}: TrackFetchContext<StandardRepeatMaskerConfig>): Promise<StandardRepeatMaskerData> {
  const file = getCachedBigBedFile(resources, track.config.url, standardRepeatMaskerSchema);
  const metadata = await file.getMetadata({ signal });
  validateLayout(metadata);
  if (region.end - region.start > track.config.maxDetailBases) {
    if (!metadata.zoomLevels.length) return { kind: "detail-required" };
    const target = (region.end - region.start) / Math.max(1, width) / 2;
    const reduction =
      metadata.zoomLevels.filter((level) => level <= target).at(-1) ?? metadata.zoomLevels[0]!;
    return { kind: "summary", summaries: await file.readZoomLevel(region, reduction, { signal }) };
  }
  const rows = await file.read(region, { signal });
  return {
    kind: "repeats",
    repeats: rows.map((row) => ({
      ...row,
      kind: "repeat" as const,
      category: repeatCategory(row.repClass),
    })),
  };
}
