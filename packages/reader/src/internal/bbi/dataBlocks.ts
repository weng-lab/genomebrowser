import { unzlibSync } from "fflate";
import { throwIfAborted } from "../abort";
import { readExactRange } from "../httpRange";
import type { BbiHeader } from "./commonHeader";
import { findPrimaryDataBlocks, type BbiQuery } from "./regionalIndex";

export type BbiDataBlock = {
  bytes: Uint8Array;
  offset: bigint;
  size: bigint;
  query: BbiQuery;
};

function decompressBlock(bytes: Uint8Array, uncompressBufferSize: number): Uint8Array {
  if (uncompressBufferSize === 0xffffffff) {
    throw new RangeError("Declared BBI decompression buffer size is not allocatable");
  }
  const output = unzlibSync(bytes, { out: new Uint8Array(uncompressBufferSize + 1) });
  if (output.byteLength > uncompressBufferSize) {
    throw new RangeError("Decompressed BBI block exceeds the declared buffer size");
  }
  return output.slice();
}

export async function readBbiDataBlocks(
  url: string,
  header: BbiHeader,
  query: BbiQuery,
  signal?: AbortSignal,
): Promise<BbiDataBlock[]> {
  const references = await findPrimaryDataBlocks(url, header, query, signal);
  const blocks: BbiDataBlock[] = [];
  for (const reference of references) {
    const compressedBytes = await readExactRange(url, reference.offset, reference.size, signal);
    let bytes = compressedBytes;
    if (header.uncompressBufferSize > 0) {
      throwIfAborted(signal);
      bytes = decompressBlock(compressedBytes, header.uncompressBufferSize);
      throwIfAborted(signal);
    }
    blocks.push({ ...reference, bytes, query });
  }
  return blocks;
}
