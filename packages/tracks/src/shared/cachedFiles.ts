import type { GenomicRegion, TrackResources } from "@weng-lab/genomebrowser";
import {
  createBigBedFile,
  createBigWigFile,
  type BigBedFileOptions,
  type BigBedRecord,
  type BigWigFile,
  type BigWigRecord,
  type BigWigValueRecord,
} from "@weng-lab/genomic-reader";
import type { z } from "zod";

// Resource keys are local to one track, so a fixed key per format is enough;
// individual readers are keyed by source URL inside the stored map.
const BIG_WIG_FILES = "bigwig-files";
const BIG_BED_FILES = "bigbed-files";

/**
 * Reads unzoomed BigWig values for one track request, reusing one file reader
 * per source URL for the lifetime of the track so file metadata (header,
 * chromosome tree, R-tree roots) is fetched once per source instead of once
 * per request. The reader lives in the track's own resources store; changing
 * a config URL simply starts a new entry under the new URL.
 */
export async function readCachedBigWigValues(
  resources: TrackResources,
  url: string,
  region: GenomicRegion,
): Promise<BigWigValueRecord[]> {
  const files = cachedFiles<BigWigFile>(resources, BIG_WIG_FILES);
  let file = files.get(url);
  if (!file) {
    file = createBigWigFile({ url });
    files.set(url, file);
  }

  const records = await file.read(region, { resolution: { mode: "unzoomed" } });
  assertValueRecords(records);
  return records;
}

/**
 * Reads BigBed rows through a validated column schema with the same per-track
 * reader reuse as {@link readCachedBigWigValues}.
 */
export async function readCachedBigBedRows<Schema extends z.ZodObject>(
  resources: TrackResources,
  url: string,
  schema: BigBedFileOptions<Schema>["schema"],
  region: GenomicRegion,
): Promise<BigBedRecord<Schema>[]> {
  const files = cachedFiles<ReturnType<typeof createBigBedFile<Schema>>>(resources, BIG_BED_FILES);
  let file = files.get(url);
  if (!file) {
    file = createBigBedFile({ url, schema });
    files.set(url, file);
  }
  return file.read(region);
}

function cachedFiles<F>(resources: TrackResources, key: string): Map<string, F> {
  const files = resources.get<Map<string, F>>(key) ?? new Map<string, F>();
  resources.set(key, files);
  return files;
}

function assertValueRecords(records: BigWigRecord[]): asserts records is BigWigValueRecord[] {
  for (const record of records) {
    if (record.kind !== "value") throw new Error("Expected unzoomed BigWig value records");
  }
}
