import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import {
  createBamFile,
  createTwoBitFile,
  type BamFile,
  type TwoBitFile,
} from "@weng-lab/genomic-reader";
import type { BamConfig } from "./schema";
import type { BamData } from "./types";

export async function fetchBam({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BamConfig>): Promise<BamData> {
  if (region.end - region.start >= config.maxWindow) {
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
  const recordsPromise = cached.file.read(region);
  // Optional reference failures must not hide alignments.
  const referencePromise = async (): Promise<Pick<BamData, "reference" | "referenceError">> => {
    // Fetch reference with alignments so retained or overscanned data can show mismatches
    // when the visible span reaches the independently configured letter threshold.
    if (!config.sequenceUrl) return { reference: [] };
    try {
      let reference = resources.get<{ url: string; file: TwoBitFile }>("bam-reference");
      if (!reference || reference.url !== config.sequenceUrl) {
        reference = {
          url: config.sequenceUrl,
          file: createTwoBitFile({ url: config.sequenceUrl }),
        };
        resources.set("bam-reference", reference);
      }
      const sequence = await reference.file.read(region);
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
