import { createBigWigFile } from "@weng-lab/genomic-reader";
import type { TrackFetchContext } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import type { BigWigConfig, BigWigData } from "./types";

export async function fetchBigWig({
  config,
  region,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigData[]> {
  return fetchBigWigRaw({ url: config.url, region });
}

export async function fetchBigWigRaw({ url, region }: { url: string; region: GenomicRegion }) {
  const file = createBigWigFile({ url });
  const records = await file.read(region, { resolution: { mode: "unzoomed" } });

  return records.map((record): BigWigData => {
    if (record.kind !== "value") {
      throw new Error("Expected unzoomed BigWig value records");
    }

    return {
      chr: record.chromosome,
      start: record.start,
      end: record.end,
      value: record.value,
    };
  });
}
