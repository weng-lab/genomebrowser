import type { GenomicRegion } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { intersectsVisibleRegion } from "../shared/viewport";
import type { BamConfig } from "./types";

/**
 * Alignments in the region that pass the configured filters. Coverage,
 * junctions, and the pileup all start from this list so they agree about which
 * alignments exist.
 */
export function filterBamRecords(
  records: readonly BamRecord[],
  filters: BamConfig["filters"],
  region: GenomicRegion,
): BamRecord[] {
  return records.filter(
    (record) =>
      intersectsVisibleRegion(record, region) &&
      (record.flags & 4) === 0 &&
      (filters.includeDuplicates || !(record.flags & 1024)) &&
      // MAPQ 255 is unavailable, not evidence of high confidence.
      (filters.minimumMappingQuality === 0 ||
        (record.mappingQuality !== 255 && record.mappingQuality >= filters.minimumMappingQuality)),
  );
}
