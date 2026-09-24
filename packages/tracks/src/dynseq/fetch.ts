import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readCachedBigWigValues, readCachedTwoBitSequence } from "../shared/cachedFiles";
import type { DynseqConfig, DynseqData } from "./types";

/**
 * Pairs each scored base with its reference nucleotide.
 *
 * Both files are read for the same region and the sequence record starts
 * exactly at the base it reports, so scores and letters align by coordinate
 * with no offset correction.
 */
export async function fetchDynseq({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<DynseqConfig>): Promise<DynseqData> {
  const [scores, sequences] = await Promise.all([
    // Source values only: a zoom summary has no single value to place on a base.
    readCachedBigWigValues(resources, config.url, region),
    readCachedTwoBitSequence(resources, config.twoBitUrl, region),
  ]);

  const sequence = sequences[0];
  if (!sequence) return [];

  const points: DynseqData = [];
  for (const record of scores) {
    for (let position = record.start; position < record.end; position++) {
      const index = position - sequence.start;
      if (index < 0 || index >= sequence.sequence.length) continue;
      points.push({ position, score: record.value, base: sequence.sequence[index]! });
    }
  }
  return points;
}
