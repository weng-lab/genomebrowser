import { BigBedParseError } from "@weng-lab/genomic-reader";
import type { GenomicRegion, TrackResources } from "@weng-lab/genomebrowser";
import { bedSchemas, type BedSchemaKey } from "./bedSchemas";
import { readCachedBigBedRows } from "./cachedFiles";

export async function readBedPreset(
  resources: TrackResources,
  url: string,
  preset: BedSchemaKey | undefined,
  region: GenomicRegion,
) {
  const selected = preset ?? "bed9";
  try {
    return await readCachedBigBedRows(resources, url, bedSchemas[selected], region);
  } catch (error) {
    if (!(error instanceof BigBedParseError)) throw error;
    throw new Error(
      `${error.message} Selected schema: ${selected}${preset === undefined ? " (default)" : ""}. Check config.bedSchema against the file's column layout.`,
      { cause: error },
    );
  }
}
