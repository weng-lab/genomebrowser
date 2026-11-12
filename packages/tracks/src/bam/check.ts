import { createBamFile } from "@weng-lab/genomic-reader";
import { openTrackFile, readTrackFile, type TrackFileCheckOptions } from "../shared/fileChecks";

const bamFile = { field: "url", name: "BAM file" };
const indexFile = { field: "indexUrl", name: "BAI index" };

/**
 * Checks that the URLs serve a BAM file and its BAI index, by reading the BAM header and the
 * start of the index. Returns the config fields to create the track with, or rejects with a
 * `TrackFileError` whose `field` names the failing file.
 */
export async function checkBamFiles(
  source: { url: string; indexUrl: string },
  options?: TrackFileCheckOptions,
): Promise<{ url: string; indexUrl: string }> {
  const signal = options?.signal;
  const { url, indexUrl } = source;
  // The reader checks both URLs at once, so check the BAM URL alone to tell which one is invalid.
  openTrackFile(bamFile, () => createBamFile({ url, indexUrl: url }));
  const file = openTrackFile(indexFile, () => createBamFile({ url, indexUrl }));
  await readTrackFile(bamFile, () => file.getHeader({ signal }), signal);
  await readTrackFile(indexFile, () => file.checkIndex({ signal }), signal);
  return { url, indexUrl };
}
