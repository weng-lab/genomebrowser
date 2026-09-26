import { bgzfBlockSize, inflateBgzfBlock, joinBamBytes } from "./bamBgzf";
import type { BamChunk } from "./bamIndex";
import type { ExactRangeOptions } from "./httpRange";
import { RequestRangeReader } from "./requestRangeReader";

/** Chunks this close share one request: reading the gap costs less than another round trip. */
const MAX_MERGED_CHUNK_GAP = 64n * 1024n;
/**
 * Bytes requested past a range's final block, whose length the index does not record. BGZF
 * permits 64 KiB blocks; sampled files stayed under 28 KiB. A larger block costs a second request.
 */
const FINAL_BLOCK_SLACK = 32n * 1024n;
const MAX_BGZF_BLOCK_SIZE = 65536n;
/** Dense regions resolve to many ranges; overlapping their round trips stays within browser connection limits. */
const MAX_CONCURRENT_RANGES = 8;

/** Compressed offsets from the first chunk's first block to the last chunk's final block. */
type BamRange = { start: bigint; end: bigint; chunks: BamChunk[] };

/**
 * Reads sorted, non-overlapping BAI chunks and returns `decode` of each chunk's inflated bytes,
 * in chunk order. Aborting the signal or any failed range cancels every in-flight request.
 */
export async function readBamChunks<T>(
  url: string,
  chunks: BamChunk[],
  decode: (bytes: Uint8Array) => T,
  options: ExactRangeOptions,
): Promise<T[]> {
  const ranges: BamRange[] = [];
  for (const chunk of chunks) {
    const range = ranges.at(-1);
    if (range && (chunk.start >> 16n) - range.end <= MAX_MERGED_CHUNK_GAP) {
      range.end = chunk.end >> 16n;
      range.chunks.push(chunk);
    } else ranges.push({ start: chunk.start >> 16n, end: chunk.end >> 16n, chunks: [chunk] });
  }
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  const reader = new RequestRangeReader(url, { ...options, signal: controller.signal });
  const decoded: T[][] = [];
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_RANGES, ranges.length) }, async () => {
        for (let index = next++; index < ranges.length; index = next++) {
          const range = ranges[index];
          const bytes = await readRange(reader, range);
          decoded[index] = range.chunks.map((chunk) =>
            decode(chunkBytes(bytes, range.start, chunk)),
          );
        }
      }),
    );
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", abort);
  }
  return decoded.flat();
}

async function readRange(reader: RequestRangeReader, range: BamRange): Promise<Uint8Array> {
  const span = range.end - range.start;
  if ((range.chunks.at(-1)!.end & 65535n) === 0n) return reader.readExact(range.start, span);
  const bytes = await reader.readBounded(range.start, span + 1n, span + FINAL_BLOCK_SLACK);
  const final = bytes.subarray(Number(span));
  const size = bgzfBlockSize(final);
  if (size !== undefined && size <= final.length) return bytes;
  const tail = await reader.readBounded(range.end, 1n, MAX_BGZF_BLOCK_SIZE);
  return joinBamBytes([bytes.subarray(0, Number(span)), tail]);
}

function chunkBytes(bytes: Uint8Array, rangeStart: bigint, chunk: BamChunk): Uint8Array {
  const parts: Uint8Array[] = [];
  let offset = chunk.start >> 16n;
  const lastBlock = chunk.end >> 16n;
  while (offset < lastBlock || (offset === lastBlock && (chunk.end & 65535n) !== 0n)) {
    const compressed = bytes.subarray(Number(offset - rangeStart));
    const size = bgzfBlockSize(compressed);
    if (size === undefined || size > compressed.length) throw new Error("Truncated BGZF block");
    const block = inflateBgzfBlock(compressed.subarray(0, size));
    const start = offset === chunk.start >> 16n ? Number(chunk.start & 65535n) : 0;
    const end = offset === lastBlock ? Number(chunk.end & 65535n) : block.length;
    if (start > end || end > block.length || block.length === 0)
      throw new Error("Invalid BAM chunk virtual offset");
    parts.push(block.subarray(start, end));
    const next = offset + BigInt(size);
    if (offset < lastBlock && next > lastBlock)
      throw new Error("BAI chunk does not end at a BGZF boundary");
    offset = next;
  }
  return joinBamBytes(parts);
}
