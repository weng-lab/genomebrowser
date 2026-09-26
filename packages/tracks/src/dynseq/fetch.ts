import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchBigWig } from "../bigwig/fetch";
import { readCachedBigWigValues, readCachedTwoBitSequence } from "../shared/cachedFiles";
import type { DynseqConfig, DynseqData } from "./types";

export async function fetchDynseq(context: TrackFetchContext<DynseqConfig>): Promise<DynseqData> {
  const {
    track: { config, base },
    demand: { region, basePairDetail },
    resources,
    signal: abortSignal,
  } = context;
  if (base.display === "dense" || !basePairDetail) {
    return { signal: await fetchBigWig(context), sequence: [] };
  }
  const [signal, sequence] = await Promise.all([
    readCachedBigWigValues(resources, config.url, region, abortSignal),
    readCachedTwoBitSequence(resources, config.twoBitUrl, region, abortSignal),
  ]);
  return { signal, sequence };
}
