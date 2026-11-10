import { checkBedSchemaColumns, readBigBedHeader } from "../shared/bigBedFileChecks";
import type { TrackFileCheckOptions } from "../shared/fileChecks";

const bigBedFile = { field: "url", name: "BigBed file" };

/**
 * Checks that a URL serves a BigBed file with enough columns for cCRE records, by reading its
 * header. Returns the config fields to create the track with, or rejects with a `TrackFileError`.
 */
export async function checkCcreBigBedFiles(
  source: { url: string },
  options?: TrackFileCheckOptions,
): Promise<{ url: string }> {
  const header = await readBigBedHeader(bigBedFile, source.url, options?.signal);
  checkBedSchemaColumns(bigBedFile, header, "ccre");
  return { url: source.url };
}
