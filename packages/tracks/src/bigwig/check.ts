import { createBigWigFile } from "@weng-lab/genomic-reader";
import { openTrackFile, readTrackFile, type TrackFileCheckOptions } from "../shared/fileChecks";

const bigWigFile = { field: "url", name: "BigWig file" };

/**
 * Checks that a URL serves a BigWig file this track can read, by reading its header. Returns the
 * config fields to create the track with, or rejects with a `TrackFileError`.
 */
export async function checkBigWigFiles(
  source: { url: string },
  options?: TrackFileCheckOptions,
): Promise<{ url: string }> {
  const signal = options?.signal;
  const file = openTrackFile(bigWigFile, () => createBigWigFile({ url: source.url }));
  await readTrackFile(bigWigFile, () => file.getZoomLevels({ signal }), signal);
  return { url: source.url };
}
