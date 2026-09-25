import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { decodeBamRecords } from "./internal/bamDecoder";
import {
  BGZF_BLOCK_SLACK,
  readBamIndex,
  selectChunks,
  type BamChunk,
  type BamIndex,
} from "./internal/bamIndex";
import { BinaryReader } from "./internal/binaryReader";
import { inflateBgzfBlocks, joinBgzfBlocks, splitVirtualOffset } from "./internal/bgzf";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";
import { RequestRangeReader } from "./internal/requestRangeReader";

/** CIGAR operation codes as defined by the SAM specification. */
export type BamCigarOperation = "M" | "I" | "D" | "N" | "S" | "H" | "P" | "=" | "X";

export type BamCigarSegment = {
  operation: BamCigarOperation;
  length: number;
};

export type BamRecord = GenomicRecord & {
  /** Query name, without the stored NUL terminator. */
  name: string;
  /** Raw SAM flag, so callers can test secondary, duplicate, or pairing bits. */
  flag: number;
  mappingQuality: number;
  strand: "+" | "-";
  cigar: BamCigarSegment[];
  /** Query sequence, or an empty string when the record stores none. */
  sequence: string;
};

export type BamReference = {
  name: string;
  length: number;
};

export type BamHeader = {
  /** The plain-text SAM header. */
  text: string;
  /** Reference sequences in the order the file defines them. */
  references: BamReference[];
};

export type BamFileOptions = {
  url: string;
  /** Defaults to `url` with `.bai` appended. */
  indexUrl?: string;
};

export interface BamFile extends GenomicFile<BamRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<BamRecord[]>;
  /** Reads the SAM header, including the reference names this file uses. */
  getHeader(options?: ReadOptions): Promise<BamHeader>;
}

const BAM_MAGIC = 0x014d4142; // "BAM\1", little-endian
/** BSIZE is 16 bits, so no BGZF block is longer than this compressed. */
const MAX_COMPRESSED_BLOCK_SIZE = 1n << 16n;

/**
 * How many index chunks to read at once. Each chunk costs a round trip, and a
 * dense locus resolves to dozens of them even after merging, so reading strictly
 * in sequence makes latency rather than bandwidth the limit.
 *
 * Higher than `MAX_CONCURRENT_MERGED_RANGES` in the BBI reader, which fetches a
 * handful of large merged ranges where this fetches many smaller ones. Measured
 * against a dense RNA-seq locus: 4 took 2.5s and 8 took 1.5s, and past 8 the
 * curve is flat, so the extra sockets buy nothing.
 */
const CHUNK_FETCH_CONCURRENCY = 8;

/**
 * How much compressed chunk data one file keeps.
 *
 * Panning re-reads almost exactly what the previous view read: the browser
 * overscans the viewport, so a step sideways lands well inside the range
 * already fetched and the index resolves it to the same chunks. Measured on a
 * 25% pan, every one of the 76 ranges was byte-identical to one just requested,
 * so without a cache each step pays the whole read again.
 *
 * Compressed bytes are kept rather than inflated blocks: they are several times
 * smaller, and re-inflating costs far less than the round trip it avoids.
 */
const MAX_CACHED_CHUNK_BYTES = 64 * 1024 * 1024;
const INITIAL_HEADER_READ_SIZE = 1n << 16n;
const MAX_HEADER_READ_SIZE = 1n << 26n;

type BamMetadataCache = {
  header?: BamHeader;
  referenceIds?: Map<string, number>;
  index?: BamIndex;
  rangeMetadata: ExactRangeMetadata;
  indexRangeMetadata: ExactRangeMetadata;
  /** Compressed chunk bytes, keyed by the exact range read. */
  chunkBytes: Map<string, Uint8Array>;
  chunkBytesSize: number;
};

/**
 * Reads BGZF-compressed BAM alignments over HTTP range requests, using the
 * companion BAI index so only the blocks overlapping a query are transferred.
 *
 * Coordinates are zero-based and half-open, matching the rest of this package
 * and the BAM format itself. Reference names are matched exactly: a file whose
 * header says `1` will not answer a query for `chr1`. Read `getHeader()` when
 * you need to discover what a file calls its references.
 *
 * Unmapped records are omitted - they carry no interval to place - but
 * secondary, supplementary, and duplicate records are returned, because whether
 * those belong in a view is the caller's decision. Test `flag` to filter them.
 */
export function createBamFile(options: BamFileOptions): BamFile {
  if (options === null || typeof options !== "object") {
    throw new TypeError("BAM file options must be an object");
  }
  const url = validateHttpUrl(options.url);
  const indexUrl =
    options.indexUrl === undefined ? `${url}.bai` : validateHttpUrl(options.indexUrl);

  const cache: BamMetadataCache = {
    rangeMetadata: {},
    indexRangeMetadata: {},
    chunkBytes: new Map(),
    chunkBytesSize: 0,
  };

  async function loadHeader(signal: AbortSignal | undefined): Promise<BamHeader> {
    if (cache.header) return cache.header;
    const reader = new RequestRangeReader(url, { signal, metadata: cache.rangeMetadata });
    const header = await readBamHeader(reader);
    throwIfAborted(signal);
    cache.header = header;
    cache.referenceIds = new Map(
      header.references.map((reference, index) => [reference.name, index]),
    );
    return header;
  }

  return {
    async getHeader(readOptions) {
      return loadHeader(readOptions?.signal);
    },

    async read(region, readOptions) {
      validateRegion(region);
      const signal = readOptions?.signal;
      throwIfAborted(signal);

      await loadHeader(signal);
      const referenceId = cache.referenceIds?.get(region.chromosome);
      if (referenceId === undefined) return [];

      if (!cache.index) {
        const indexReader = new RequestRangeReader(indexUrl, {
          signal,
          metadata: cache.indexRangeMetadata,
        });
        cache.index = await readBamIndex(indexReader);
        throwIfAborted(signal);
      }

      const reference = cache.index.references[referenceId];
      if (!reference) return [];
      const chunks = selectChunks(reference, region.start, region.end);
      if (chunks.length === 0) return [];

      const reader = new RequestRangeReader(url, { signal, metadata: cache.rangeMetadata });

      const readRange = async (offset: bigint, length: bigint): Promise<Uint8Array> => {
        const key = `${offset}:${length}`;
        const cached = cache.chunkBytes.get(key);
        if (cached !== undefined) {
          throwIfAborted(signal);
          // Refresh recency so a range still in use is not the next evicted.
          cache.chunkBytes.delete(key);
          cache.chunkBytes.set(key, cached);
          return cached;
        }
        const fetched = await reader.readBounded(offset, 1n, length);
        throwIfAborted(signal);
        cache.chunkBytes.set(key, fetched);
        cache.chunkBytesSize += fetched.byteLength;
        // Map iterates in insertion order, so the first key is the oldest.
        while (cache.chunkBytesSize > MAX_CACHED_CHUNK_BYTES) {
          const oldest = cache.chunkBytes.keys().next();
          if (oldest.done) break;
          cache.chunkBytesSize -= cache.chunkBytes.get(oldest.value)?.byteLength ?? 0;
          cache.chunkBytes.delete(oldest.value);
        }
        return fetched;
      };

      const readChunk = async (chunk: BamChunk): Promise<BamRecord[]> => {
        const begin = splitVirtualOffset(chunk.begin);
        const end = splitVirtualOffset(chunk.end);
        const span = end.blockOffset - begin.blockOffset;
        // The span already covers every block before the final one, so only the
        // final block needs slack, and only when the chunk reads into it. Try
        // the slack real blocks need, then the format's maximum.
        for (const slack of [BGZF_BLOCK_SLACK, MAX_COMPRESSED_BLOCK_SIZE]) {
          const bytes = await readRange(begin.blockOffset, span + slack);
          const blocks = inflateBgzfBlocks(bytes, begin.blockOffset);
          if (blocks.length === 0) return [];
          const { data, startIndexByBlockOffset } = joinBgzfBlocks(blocks);

          const endBlockStart = startIndexByBlockOffset.get(end.blockOffset);
          // Reading short would silently drop the tail of the chunk, so when the
          // final block did not arrive, read again with the format's maximum.
          if (
            end.dataOffset > 0 &&
            endBlockStart === undefined &&
            slack !== MAX_COMPRESSED_BLOCK_SIZE
          )
            continue;

          const from = (startIndexByBlockOffset.get(begin.blockOffset) ?? 0) + begin.dataOffset;
          const to = endBlockStart === undefined ? data.length : endBlockStart + end.dataOffset;

          return [
            ...decodeBamRecords(data, from, to, {
              referenceId,
              chromosome: region.chromosome,
              regionStart: region.start,
              regionEnd: region.end,
            }),
          ];
        }
        return [];
      };

      // A dense locus resolves to hundreds of disjoint chunks, and awaiting them
      // one after another costs a round trip each: the wall clock ends up
      // proportional to the chunk count rather than to the bytes read. Reading a
      // few at a time keeps the same chunks and the same bytes.
      const perChunk: BamRecord[][] = Array.from({ length: chunks.length }, () => []);
      let nextChunk = 0;
      await Promise.all(
        Array.from({ length: Math.min(CHUNK_FETCH_CONCURRENCY, chunks.length) }, async () => {
          for (;;) {
            const index = nextChunk++;
            const chunk = chunks[index];
            if (!chunk) return;
            perChunk[index] = await readChunk(chunk);
          }
        }),
      );

      const records: BamRecord[] = perChunk.flat();
      records.sort((left, right) => left.start - right.start || left.end - right.end);
      return records;
    },
  };
}

/**
 * Reads and parses the BAM header. The header can span many BGZF blocks, and
 * nothing records its length up front, so this grows the read until the header
 * parses completely.
 */
async function readBamHeader(reader: RequestRangeReader): Promise<BamHeader> {
  let readSize = INITIAL_HEADER_READ_SIZE;
  for (;;) {
    const bytes = await reader.readBounded(0n, 1n, readSize);
    throwIfAborted(reader.signal);
    const blocks = inflateBgzfBlocks(bytes, 0n);
    const { data } = joinBgzfBlocks(blocks);

    const header = parseBamHeader(data);
    if (header) return header;

    const reachedEndOfFile = BigInt(bytes.length) < readSize;
    if (reachedEndOfFile) {
      throw new Error("Invalid BAM file: the header is truncated");
    }
    readSize *= 4n;
    if (readSize > MAX_HEADER_READ_SIZE) {
      throw new Error("Invalid BAM file: the header exceeds 64 MiB");
    }
  }
}

/** Returns undefined when `data` does not yet hold the complete header. */
export function parseBamHeader(data: Uint8Array): BamHeader | undefined {
  if (data.length < 8) return undefined;
  const binary = new BinaryReader(data, "little-endian");
  if (binary.readUint32() !== BAM_MAGIC) {
    throw new Error("Expected a BAM file");
  }

  const textLength = binary.readUint32();
  if (binary.remaining < textLength + 4) return undefined;
  const text = new TextDecoder().decode(
    data.subarray(binary.position, binary.position + textLength),
  );
  binary.skip(textLength);

  const referenceCount = binary.readUint32();
  const references: BamReference[] = [];
  for (let index = 0; index < referenceCount; index++) {
    if (binary.remaining < 4) return undefined;
    const nameLength = binary.readUint32();
    if (binary.remaining < nameLength + 4) return undefined;
    // Stored names are NUL-terminated and the length counts the terminator.
    const name = new TextDecoder().decode(
      data.subarray(binary.position, binary.position + Math.max(0, nameLength - 1)),
    );
    binary.skip(nameLength);
    references.push({ name, length: binary.readUint32() });
  }

  return { text, references };
}
