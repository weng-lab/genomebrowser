import { bedSchemaStandardColumns, type BedSchemaKey } from "../shared/bedSchemas";
import { checkBedSchemaColumns, readBigBedHeader } from "../shared/bigBedFileChecks";
import type { TrackFileCheckOptions } from "../shared/fileChecks";

const bigBedFile = { field: "url", name: "BigBed file" };
// The presets made only of standard BED columns, widest first.
const standardPresets = ["bed9", "bed6", "bed5", "bed4", "bed3"] as const;

/**
 * Checks that a URL serves a BigBed file this track can read, by reading its header. Without a
 * `bedSchema`, chooses the widest standard BED preset among the columns the header declares
 * standard. With one, checks only that the file has enough columns, because files often declare
 * standard columns as custom. Returns the config fields to create the track with, or rejects
 * with a `TrackFileError`.
 */
export async function checkBigBedFiles(
  source: { url: string; bedSchema?: BedSchemaKey },
  options?: TrackFileCheckOptions,
): Promise<{ url: string; bedSchema: BedSchemaKey }> {
  const header = await readBigBedHeader(bigBedFile, source.url, options?.signal);
  const standardColumns = Math.min(header.definedFieldCount, header.fieldCount);
  const bedSchema =
    source.bedSchema ??
    standardPresets.find((key) => bedSchemaStandardColumns[key] <= standardColumns) ??
    // Every record has its three coordinates, even when the header declares fewer standard columns.
    "bed3";
  checkBedSchemaColumns(bigBedFile, header, bedSchema);
  return { url: source.url, bedSchema };
}
