import { readCachedTwoBitSequence } from "../shared/cachedFiles";
import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { createBamFile, type BamFile } from "@weng-lab/genomic-reader";
import type { BamConfig } from "./schema";
import type { BamData } from "./types";

export async function fetchBam({
  track: { config },
  demand: { region, visibleRegion, basePairDetail },
  resources,
  signal,
}: TrackFetchContext<BamConfig>): Promise<BamData> {
  if (visibleRegion.end - visibleRegion.start >= config.maxWindow) {
    return {
      records: [],
      reference: [],
      message: "Zoom in to see BAM track",
    };
  }
  let cached = resources.get<{ url: string; indexUrl: string; file: BamFile }>("bam-file");
  if (!cached || cached.url !== config.url || cached.indexUrl !== config.indexUrl) {
    cached = {
      url: config.url,
      indexUrl: config.indexUrl,
      file: createBamFile({ url: config.url, indexUrl: config.indexUrl }),
    };
    resources.set("bam-file", cached);
  }
  const recordsPromise = cached.file.read(region, { signal });
  // Optional reference failures must not hide alignments.
  const referencePromise = async (): Promise<Pick<BamData, "reference" | "referenceError">> => {
    if (!config.sequenceUrl || !basePairDetail) return { reference: [] };
    try {
      const sequence = await readCachedTwoBitSequence(
        resources,
        config.sequenceUrl,
        region,
        signal,
      );
      if (sequence.length === 0)
        return { reference: [], referenceError: "Reference sequence not found for this region." };
      return { reference: sequence };
    } catch (error) {
      return {
        reference: [],
        referenceError: error instanceof Error ? error.message : "Reference request failed.",
      };
    }
  };
  const [records, reference] = await Promise.all([recordsPromise, referencePromise()]);
  return { records, ...reference };
}
