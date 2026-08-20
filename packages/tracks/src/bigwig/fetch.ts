import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import { createBigWigFile } from "@weng-lab/genomic-reader";
import type { BigWigRecord, BigWigValueRecord } from "@weng-lab/genomic-reader";
import type { BigWigConfig } from "./types";

export async function fetchBigWig({
  config,
  region,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigValueRecord[]> {
  return fetchBigWigRaw({ url: config.url, region });
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
