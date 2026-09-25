import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchBigWig } from "../bigwig/fetch";
import { readCachedBigWigValues, readCachedTwoBitSequence } from "../shared/cachedFiles";
import type { DynseqConfig, DynseqData } from "./types";

export async function fetchDynseq(context: TrackFetchContext<DynseqConfig>): Promise<DynseqData> {
  const {
    track: { config, base },
    demand: { region, width },
    resources,
  } = context;
  // Pixels per base is unchanged by overscan. Prepare sequence at this resolution
  // even when maxLetterBases still hides it; that threshold is applied during rendering.
  // Keeping intervals intact avoids allocating one object per base in signal mode.
  if (
    base.display === "dense" ||
    width / Math.max(1, region.end - region.start) < config.minPixelsPerBase
  ) {
    return { signal: await fetchBigWig(context), sequence: [] };
  }
  const [signal, sequence] = await Promise.all([
    readCachedBigWigValues(resources, config.url, region),
    readCachedTwoBitSequence(resources, config.twoBitUrl, region),
  ]);
  return { signal, sequence };
}
