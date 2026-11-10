import { readBigBedHeader } from "../shared/bigBedFileChecks";
import { TrackFileError, type TrackFileCheckOptions } from "../shared/fileChecks";
import { bigGenePredSchema } from "./data/schema";

const bigBedFile = { field: "url", name: "BigBed file" };
const bigGenePredColumns = 3 + Object.keys(bigGenePredSchema.shape).length;

/**
 * Checks that a URL serves a BigBed file with the BigGenePred columns, by reading its header.
 * Returns the config fields to create the track with, or rejects with a `TrackFileError`.
 */
export async function checkGeneFiles(
  source: { url: string },
  options?: TrackFileCheckOptions,
): Promise<{ url: string }> {
  const header = await readBigBedHeader(bigBedFile, source.url, options?.signal);
  // Gene files often declare every column standard, so only the total is meaningful.
  if (header.fieldCount < bigGenePredColumns)
    throw new TrackFileError(
      "UNREADABLE",
      bigBedFile.field,
      `The ${bigBedFile.name} has ${header.fieldCount} columns; gene tracks read BigGenePred files, which have ${bigGenePredColumns}.`,
    );
  return { url: source.url };
}
