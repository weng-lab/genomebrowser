import type { GenomicRegion, TrackResources } from "@weng-lab/genomebrowser";
import {
  createBigBedFile,
  createBigWigFile,
  type BigBedFileOptions,
  type BigBedRecord,
  type BigWigFile,
  type BigWigRecord,
} from "@weng-lab/genomic-reader";
import type { z } from "zod";

// Resource keys are local to one track, so a fixed key per format is enough;
// individual readers are keyed by source URL inside the stored map.
const BIG_WIG_FILES = "bigwig-files";
const BIG_BED_FILES = "bigbed-files";

/**
 * Reads BigWig records at a resolution suited to the viewport, reusing one
 * file reader per source URL for the lifetime of the track. The reader lives
 * in the track's own resources store; changing a config URL starts a new entry
 * under the new URL.
 */
export async function readCachedBigWigRecords(
  resources: TrackResources,
  url: string,
  region: GenomicRegion,
  width: number,
): Promise<BigWigRecord[]> {
  const files = cachedFiles<BigWigFile>(resources, BIG_WIG_FILES);
  let file = files.get(url);
  if (!file) {
    file = createBigWigFile({ url });
    files.set(url, file);
  }

  const reductionLevel = selectZoomLevel(
    await file.getZoomLevels(),
    region.end - region.start,
    width,
  );
  if (reductionLevel !== undefined) return file.readZoomLevel(region, reductionLevel);
  return file.read(region);
}

function selectZoomLevel(
  zoomLevels: readonly number[],
  regionWidth: number,
  viewportWidth: number,
): number | undefined {
  const pixelWidth = Math.max(1, Math.floor(viewportWidth));
  const targetReduction = regionWidth / pixelWidth / 2;
  let selected: number | undefined;
  for (const zoomLevel of zoomLevels) {
    if (zoomLevel <= targetReduction && (selected === undefined || zoomLevel > selected)) {
      selected = zoomLevel;
    }
  }
  return selected;
}

/**
 * Reads BigBed rows through a validated column schema with the same per-track
 * reader reuse as {@link readCachedBigWigRecords}.
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
