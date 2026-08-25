import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import {
  decodeBigWigValueBlock,
  decodeBigWigZoomBlock,
  stableSortBigWigRecords,
} from "./internal/bigWigDecoder";
import { lookupChromosome, type Chromosome } from "./internal/bbi/chromosomeTree";
import { readBbiHeader, type BbiHeader } from "./internal/bbi/commonHeader";
import { readBbiDataBlocks } from "./internal/bbi/dataBlocks";
import {
  bootstrapPrimaryRTree,
  readPrimaryRTreeRoot,
  type ParsedPrimaryRTreeNode,
  type PrimaryRTreeHeader,
} from "./internal/bbi/regionalIndex";
import { readBbiZoomHeaders, type BbiZoomHeader } from "./internal/bbi/zoomHeaders";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";
import { RequestRangeReader } from "./internal/requestRangeReader";
import type { ByteOrder } from "./internal/binaryReader";

export type BigWigFileOptions = {
  url: string;
};

export type BigWigValueRecord = GenomicRecord & {
  kind: "value";
  value: number;
};

export type BigWigSummaryRecord = GenomicRecord & {
  kind: "summary";
  validCount: number;
  min: number;
  max: number;
  sum: number;
  sumSquares: number;
  mean: number;
};

export type BigWigRecord = BigWigValueRecord | BigWigSummaryRecord;

export interface BigWigFile extends GenomicFile<BigWigValueRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<BigWigValueRecord[]>;
  readZoomLevel(
    region: GenomicRegion,
    reductionLevel: number,
    options?: ReadOptions,
  ): Promise<BigWigSummaryRecord[]>;
  getZoomLevels(options?: ReadOptions): Promise<readonly number[]>;
}

type BigWigMetadataCache = {
  header?: BbiHeader;
  zoomHeaders?: readonly BbiZoomHeader[];
  zoomLevels?: readonly number[];
  chromosomes: Map<string, Chromosome | undefined>;
  rTreeHeaders: Map<bigint, PrimaryRTreeHeader>;
  rTreeRoots: Map<bigint, ParsedPrimaryRTreeNode>;
  rangeMetadata: ExactRangeMetadata;
};

function validateReductionLevel(reductionLevel: number): number {
  if (
    typeof reductionLevel !== "number" ||
    !Number.isFinite(reductionLevel) ||
    !Number.isInteger(reductionLevel)
  ) {
    throw new TypeError("BigWig reductionLevel must be a finite integer");
  }
  if (reductionLevel <= 0) {
    throw new RangeError("BigWig reductionLevel must be greater than zero");
  }
  return reductionLevel;
}

async function loadHeader(
  url: string,
  cache: BigWigMetadataCache,
  requestReader: RequestRangeReader,
  signal?: AbortSignal,
): Promise<BbiHeader> {
  const cached = cache.header;
  if (cached !== undefined) {
    throwIfAborted(signal);
    return cached;
  }

  const header = await readBbiHeader(url, { signal, metadata: cache.rangeMetadata }, requestReader);
  throwIfAborted(signal);
  if (header.format !== "bigWig") {
    throw new Error("Expected a BigWig file");
  }
  cache.header = header;
  return header;
}

async function loadZoomHeaders(
  url: string,
  header: BbiHeader,
  cache: BigWigMetadataCache,
  requestReader: RequestRangeReader,
  signal?: AbortSignal,
): Promise<readonly BbiZoomHeader[]> {
  const cached = cache.zoomHeaders;
  if (cached !== undefined) {
    throwIfAborted(signal);
    return cached;
  }

  const zoomHeaders = await readBbiZoomHeaders(
    url,
    header,
    {
      signal,
      metadata: cache.rangeMetadata,
    },
    requestReader,
  );
  throwIfAborted(signal);
  cache.zoomHeaders = zoomHeaders;
  return zoomHeaders;
}

type BlockDecoder<RecordType extends BigWigRecord> = (
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  chromosomeId: number,
  chromosome: string,
  regionStart: number,
  regionEnd: number,
  signal?: AbortSignal,
) => RecordType[];

async function readRecords<RecordType extends BigWigRecord>(
  url: string,
  cache: BigWigMetadataCache,
  region: GenomicRegion,
  zoom: { reductionLevel: number } | undefined,
  decodeBlock: BlockDecoder<RecordType>,
  signal?: AbortSignal,
): Promise<RecordType[]> {
  validateRegion(region);
  throwIfAborted(signal);

  const rangeOptions = { signal, metadata: cache.rangeMetadata };
  const requestReader =
    cache.header === undefined
      ? await RequestRangeReader.withPrefix(url, 64n, 2n * 1024n, rangeOptions)
      : new RequestRangeReader(url, rangeOptions);
  throwIfAborted(signal);
  const header = await loadHeader(url, cache, requestReader, signal);

  let indexOffset: bigint;
  if (zoom === undefined) {
    indexOffset = header.unzoomedIndexOffset;
  } else {
    const zoomHeaders = await loadZoomHeaders(url, header, cache, requestReader, signal);
    const selected = zoomHeaders.find(
      (zoomHeader) => zoomHeader.reductionLevel === zoom.reductionLevel,
    );
    if (selected === undefined) {
      throw new RangeError(
        `BigWig reduction level ${zoom.reductionLevel} is not available in this file`,
      );
    }
    indexOffset = selected.indexOffset;
  }
  throwIfAborted(signal);

  let chromosome: Chromosome | undefined;
  if (cache.chromosomes.has(region.chromosome)) {
    chromosome = cache.chromosomes.get(region.chromosome);
    throwIfAborted(signal);
  } else {
    chromosome = await lookupChromosome(
      url,
      header,
      region.chromosome,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(signal);
    cache.chromosomes.set(region.chromosome, chromosome);
  }
  if (chromosome === undefined) return [];

  let rTreeHeader = cache.rTreeHeaders.get(indexOffset);
  let rTreeRoot = cache.rTreeRoots.get(indexOffset);
  if (rTreeHeader === undefined) {
    const bootstrap = await bootstrapPrimaryRTree(
      url,
      header,
      indexOffset,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(signal);
    rTreeHeader = bootstrap.tree;
    rTreeRoot = bootstrap.root;
    cache.rTreeHeaders.set(indexOffset, rTreeHeader);
    if (rTreeRoot !== undefined) cache.rTreeRoots.set(indexOffset, rTreeRoot);
  } else {
    throwIfAborted(signal);
  }
  if (rTreeRoot === undefined && rTreeHeader.itemCount > 0n) {
    rTreeRoot = await readPrimaryRTreeRoot(url, header, rTreeHeader, rangeOptions, requestReader);
    throwIfAborted(signal);
    cache.rTreeRoots.set(indexOffset, rTreeRoot);
  }

  const blocks = await readBbiDataBlocks(
    url,
    header,
    rTreeHeader,
    { chromosomeId: chromosome.id, start: region.start, end: region.end },
    rangeOptions,
    requestReader,
    rTreeRoot,
  );
  throwIfAborted(signal);

  const records: RecordType[] = [];
  for (const block of blocks) {
    throwIfAborted(signal);
    records.push(
      ...decodeBlock(
        block.bytes,
        header.byteOrder,
        chromosome.id,
        region.chromosome,
        region.start,
        region.end,
        signal,
      ),
    );
    throwIfAborted(signal);
  }

  throwIfAborted(signal);
  const sortedRecords = stableSortBigWigRecords(records);
  throwIfAborted(signal);
  return sortedRecords;
}

async function readUnzoomedValues(
  url: string,
  cache: BigWigMetadataCache,
  region: GenomicRegion,
  signal?: AbortSignal,
): Promise<BigWigValueRecord[]> {
  return readRecords(url, cache, region, undefined, decodeBigWigValueBlock, signal);
}

async function readZoomSummaries(
  url: string,
  cache: BigWigMetadataCache,
  region: GenomicRegion,
  reductionLevel: number,
  signal?: AbortSignal,
): Promise<BigWigSummaryRecord[]> {
  validateRegion(region);
  validateReductionLevel(reductionLevel);
  return readRecords(url, cache, region, { reductionLevel }, decodeBigWigZoomBlock, signal);
}

export function createBigWigFile(options: BigWigFileOptions): BigWigFile {
  if (options === null || typeof options !== "object") {
    throw new TypeError("BigWig file options must be an object");
  }
  const url = validateHttpUrl(options.url);
  const cache: BigWigMetadataCache = {
    chromosomes: new Map(),
    rTreeHeaders: new Map(),
    rTreeRoots: new Map(),
    rangeMetadata: {},
  };

  return {
    read(region, readOptions) {
      return readUnzoomedValues(url, cache, region, readOptions?.signal);
    },
    readZoomLevel(region, reductionLevel, readOptions) {
      return readZoomSummaries(url, cache, region, reductionLevel, readOptions?.signal);
    },
    async getZoomLevels(readOptions) {
      const signal = readOptions?.signal;
      throwIfAborted(signal);
      const rangeOptions = { signal, metadata: cache.rangeMetadata };
      const requestReader =
        cache.header === undefined
          ? await RequestRangeReader.withPrefix(url, 64n, 2n * 1024n, rangeOptions)
          : new RequestRangeReader(url, rangeOptions);
      throwIfAborted(signal);
      const header = await loadHeader(url, cache, requestReader, signal);
      const zoomHeaders = await loadZoomHeaders(url, header, cache, requestReader, signal);
      throwIfAborted(signal);

      if (cache.zoomLevels === undefined) {
        cache.zoomLevels = Object.freeze(
          zoomHeaders
            .map(({ reductionLevel }) => reductionLevel)
            .sort((left, right) => left - right),
        );
      }
      return cache.zoomLevels;
    },
  };
}
