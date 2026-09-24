import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { decodeBamRecords } from "./internal/bamDecoder";
import { readBamIndex, selectChunks, type BamIndex } from "./internal/bamIndex";
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
const INITIAL_HEADER_READ_SIZE = 1n << 16n;
const MAX_HEADER_READ_SIZE = 1n << 26n;

type BamMetadataCache = {
  header?: BamHeader;
  referenceIds?: Map<string, number>;
  index?: BamIndex;
  rangeMetadata: ExactRangeMetadata;
  indexRangeMetadata: ExactRangeMetadata;
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

  const cache: BamMetadataCache = { rangeMetadata: {}, indexRangeMetadata: {} };

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
      const records: BamRecord[] = [];
      for (const chunk of chunks) {
        const begin = splitVirtualOffset(chunk.begin);
        const end = splitVirtualOffset(chunk.end);
        // The index gives the end block's offset but not its length, so read
        // one maximum block past it and let the inflater stop where it runs out.
        const length = end.blockOffset - begin.blockOffset + MAX_COMPRESSED_BLOCK_SIZE;
        const bytes = await reader.readBounded(begin.blockOffset, 1n, length);
        throwIfAborted(signal);

        const blocks = inflateBgzfBlocks(bytes, begin.blockOffset);
        if (blocks.length === 0) continue;
        const { data, startIndexByBlockOffset } = joinBgzfBlocks(blocks);

        const from = (startIndexByBlockOffset.get(begin.blockOffset) ?? 0) + begin.dataOffset;
        const endBlockStart = startIndexByBlockOffset.get(end.blockOffset);
        const to = endBlockStart === undefined ? data.length : endBlockStart + end.dataOffset;

        for (const record of decodeBamRecords(data, from, to, {
          referenceId,
          chromosome: region.chromosome,
          regionStart: region.start,
          regionEnd: region.end,
        })) {
          records.push(record);
        }
      }

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
