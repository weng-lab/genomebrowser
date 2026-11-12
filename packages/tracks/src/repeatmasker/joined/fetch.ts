import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigBedRecord } from "@weng-lab/genomic-reader";
import { fetchBigBedRows } from "../../bigbed/fetch";
import { bigRmskSchema, type BigRmskConfig } from "./schema";
import type { BigRmskData, BigRmskRepeat } from "./types";

export async function fetchBigRmsk({
  track: { config },
  demand: { region },
  resources,
  signal,
}: TrackFetchContext<BigRmskConfig>): Promise<BigRmskData> {
  const rows = await fetchBigBedRows({
    url: config.url,
    schema: bigRmskSchema,
    region,
    resources,
    signal,
  });
  return rows.map(prepareRepeat);
}

function prepareRepeat(row: BigBedRecord<typeof bigRmskSchema>): BigRmskRepeat {
  const fail = (reason: string): never => {
    throw new Error(
      `Invalid bigRmsk record "${row.name}" at ${row.chromosome}:${row.start}-${row.end}: ${reason}`,
    );
  };
  if (
    row.blockCount < 1 ||
    row.blockSizes.length !== row.blockCount ||
    row.blockStarts.length !== row.blockCount
  ) {
    fail("blockCount must match blockSizes and blockStarts.");
  }
  if (row.thickStart < row.start || row.thickEnd > row.end || row.thickStart > row.thickEnd) {
    fail("aligned coordinates must be ordered and within the record.");
  }
  const alignedBlocks: BigRmskRepeat["alignedBlocks"] = [];
  for (let index = 0; index < row.blockCount; index += 1) {
    const offset = row.blockStarts[index]!;
    const size = row.blockSizes[index]!;
    if (offset === -1) continue; // Unaligned consensus; size may be negative for overlaps.
    if (offset < 0 || size <= 0)
      fail("aligned blocks require a non-negative start and positive size.");
    const start = row.start + offset;
    const end = start + size;
    if (start < row.thickStart || end > row.thickEnd)
      fail("aligned blocks must lie within thickStart/thickEnd.");
    if (alignedBlocks.length && start < alignedBlocks[alignedBlocks.length - 1]!.start)
      fail("aligned blocks must be in genomic order.");
    alignedBlocks.push({ chromosome: row.chromosome, start, end });
  }
  const separator = row.name.indexOf("#");
  const repeatName = separator < 0 ? row.name : row.name.slice(0, separator);
  const classification = separator < 0 ? "Unknown" : row.name.slice(separator + 1);
  const familySeparator = classification.indexOf("/");
  const repeatClass =
    familySeparator < 0 ? classification : classification.slice(0, familySeparator);
  const repeatFamily = familySeparator < 0 ? "" : classification.slice(familySeparator + 1);
  return { ...row, repeatName, repeatClass, repeatFamily, alignedBlocks };
}
