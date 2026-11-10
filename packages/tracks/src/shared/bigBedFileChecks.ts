import { bed3Schema, createBigBedFile, type BigBedHeader } from "@weng-lab/genomic-reader";
import { bedSchemas, type BedSchemaKey } from "./bedSchemas";
import { TrackFileError, openTrackFile, readTrackFile, type TrackFile } from "./fileChecks";

/** Reads a BigBed file's header, which holds its column counts. */
export async function readBigBedHeader(
  file: TrackFile,
  url: string,
  signal?: AbortSignal,
): Promise<BigBedHeader> {
  const bigBed = openTrackFile(file, () => createBigBedFile({ url, schema: bed3Schema }));
  return readTrackFile(file, () => bigBed.getHeader({ signal }), signal);
}

/** Every column in each record, counting the three coordinate columns. */
function bedSchemaColumns(key: BedSchemaKey): number {
  return 3 + Object.keys(bedSchemas[key].shape).length;
}

/**
 * Rejects a BigBed file whose header declares too few columns for a preset. Only the total
 * counts: tracks read columns by position, whether the file declares them standard or custom.
 */
export function checkBedSchemaColumns(
  file: TrackFile,
  header: BigBedHeader,
  key: BedSchemaKey,
): void {
  const columns = bedSchemaColumns(key);
  if (header.fieldCount < columns)
    throw new TrackFileError(
      "UNREADABLE",
      file.field,
      `The ${file.name} has ${header.fieldCount} columns; ${key} needs ${columns}.`,
    );
}
