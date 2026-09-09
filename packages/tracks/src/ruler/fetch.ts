import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { createTwoBitFile, type TwoBitFile, type TwoBitRecord } from "@weng-lab/genomic-reader";

import type { RulerConfig } from "./schema";
export type RulerData = { records: TwoBitRecord[]; error?: string };

export async function fetchRuler({
  track: { config },
  demand: { region, width },
  resources,
}: TrackFetchContext<RulerConfig>): Promise<RulerData> {
  if (!config.sequenceUrl || width / (region.end - region.start) < config.sequenceMinPixelsPerBase)
    return { records: [] };
  // The browser's overscan uses the same pixels/base as the visible viewport.
  const key = "ruler-sequence-file";
  let cached = resources.get<{ url: string; file: TwoBitFile }>(key);
  if (!cached || cached.url !== config.sequenceUrl) {
    cached = { url: config.sequenceUrl, file: createTwoBitFile({ url: config.sequenceUrl }) };
    resources.set(key, cached);
  }
  try {
    return { records: await cached.file.read(region) };
  } catch (error) {
    // Coordinates remain useful even when the optional sequence source fails.
    return {
      records: [],
      error: error instanceof Error ? error.message : "Sequence request failed",
    };
  }
}
