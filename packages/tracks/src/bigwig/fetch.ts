import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import { createBigWigFile } from "@weng-lab/genomic-reader";
import type { BigWigFile, BigWigRecord, BigWigValueRecord } from "@weng-lab/genomic-reader";
import type { BigWigConfig } from "./types";

/**
 * Fetcher-owned cache entry for the track's BigWig file reader. The URL rides
 * along so the fetcher can detect source changes and replace the file itself;
 * core never inspects stored values.
 */
type CachedBigWigFile = { url: string; file: BigWigFile };

export async function fetchBigWig({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigValueRecord[]> {
  const cached = resources.get<CachedBigWigFile>("file");
  const file = cached?.url === config.url ? cached.file : createBigWigFile({ url: config.url });
  resources.set("file", { url: config.url, file });

  const records = await file.read(region, {
    resolution: { mode: "unzoomed" },
  });
  assertValueRecords(records);
  return records;
}

export async function fetchBigWigRaw({ url, region }: { url: string; region: GenomicRegion }) {
  const records = await createBigWigFile({ url }).read(region, {
    resolution: { mode: "unzoomed" },
  });
  assertValueRecords(records);
  return records;
}

function assertValueRecords(records: BigWigRecord[]): asserts records is BigWigValueRecord[] {
  for (const record of records) {
    if (record.kind !== "value") throw new Error("Expected unzoomed BigWig value records");
  }
}
