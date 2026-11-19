import { readFileSync } from "node:fs";
import { join } from "node:path";

function fixture(path: string) {
  return new Uint8Array(
    readFileSync(join(import.meta.dirname, "../../../packages/reader/test/fixtures", path)),
  );
}

/** Track files from the reader package's fixtures, as the bytes a test host serves. */
export const trackFiles = {
  bigWig: fixture("bigwig/basic.bw"),
  bed6: fixture("bigbed/basic.bb"),
  bam: fixture("bam/bamExample.bam"),
  bai: fixture("bam/bamExample.bam.bai"),
};

/**
 * A copy of the BED6 fixture whose header declares other column counts, standing in for BigBed
 * files of other layouts, such as gene and cCRE files. Adding a track reads only the header.
 */
export function bigBedWithColumns(fieldCount: number, definedFieldCount: number) {
  const bytes = trackFiles.bed6.slice();
  const view = new DataView(bytes.buffer);
  view.setUint16(32, fieldCount, true);
  view.setUint16(34, definedFieldCount, true);
  return bytes;
}
