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
import { readPrimaryRTreeHeader, type PrimaryRTreeHeader } from "./internal/bbi/regionalIndex";
import { readBbiZoomHeaders, type BbiZoomHeader } from "./internal/bbi/zoomHeaders";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";

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

export type BigWigResolution =
  | { mode: "unzoomed" }
  | { mode: "auto"; basesPerPixel: number }
  | { mode: "level"; reductionLevel: number };

export type BigWigReadOptions = ReadOptions & {
  resolution?: BigWigResolution;
};

export interface BigWigFile extends GenomicFile<BigWigRecord> {
  read(region: GenomicRegion, options?: BigWigReadOptions): Promise<BigWigRecord[]>;
  getZoomLevels(options?: ReadOptions): Promise<readonly number[]>;
}

type BigWigMetadataCache = {
  header?: BbiHeader;
  zoomHeaders?: readonly BbiZoomHeader[];
  zoomLevels?: readonly number[];
  chromosomes: Map<string, Chromosome | undefined>;
  rTreeHeaders: Map<bigint, PrimaryRTreeHeader>;
  rangeMetadata: ExactRangeMetadata;
};

type SelectedResolution =
  | { mode: "unzoomed"; indexOffset: bigint }
  | { mode: "zoom"; indexOffset: bigint };

function validateResolution(resolution: BigWigResolution | undefined): BigWigResolution {
  if (resolution === undefined) return { mode: "unzoomed" };
  if (resolution === null || typeof resolution !== "object") {
    throw new TypeError("BigWig resolution must be an object");
  }

  if (resolution.mode === "unzoomed") return resolution;
  if (resolution.mode === "auto") {
    if (
      typeof resolution.basesPerPixel !== "number" ||
      !Number.isFinite(resolution.basesPerPixel)
    ) {
      throw new TypeError("BigWig basesPerPixel must be a finite number");
    }
    if (resolution.basesPerPixel <= 0) {
      throw new RangeError("BigWig basesPerPixel must be greater than zero");
    }
    return resolution;
  }
  if (resolution.mode === "level") {
    if (
      typeof resolution.reductionLevel !== "number" ||
      !Number.isFinite(resolution.reductionLevel) ||
      !Number.isInteger(resolution.reductionLevel)
    ) {
      throw new TypeError("BigWig reductionLevel must be a finite integer");
    }
    if (resolution.reductionLevel <= 0) {
      throw new RangeError("BigWig reductionLevel must be greater than zero");
    }
    return resolution;
  }

  throw new TypeError("Unsupported BigWig resolution mode");
}

async function loadHeader(
  url: string,
  cache: BigWigMetadataCache,
  signal?: AbortSignal,
): Promise<BbiHeader> {
  const cached = cache.header;
  if (cached !== undefined) {
    throwIfAborted(signal);
    return cached;
  }

  const header = await readBbiHeader(url, { signal, metadata: cache.rangeMetadata });
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
  signal?: AbortSignal,
): Promise<readonly BbiZoomHeader[]> {
  const cached = cache.zoomHeaders;
  if (cached !== undefined) {
    throwIfAborted(signal);
    return cached;
  }

  const zoomHeaders = await readBbiZoomHeaders(url, header, {
    signal,
    metadata: cache.rangeMetadata,
  });
  throwIfAborted(signal);
  cache.zoomHeaders = zoomHeaders;
  return zoomHeaders;
}

async function selectResolution(
  url: string,
  header: BbiHeader,
  cache: BigWigMetadataCache,
  resolution: BigWigResolution,
  signal?: AbortSignal,
): Promise<SelectedResolution> {
  if (resolution.mode === "unzoomed") {
    return { mode: "unzoomed", indexOffset: header.unzoomedIndexOffset };
  }

  const zoomHeaders = await loadZoomHeaders(url, header, cache, signal);
  if (resolution.mode === "level") {
    const selected = zoomHeaders.find(
      (zoomHeader) => zoomHeader.reductionLevel === resolution.reductionLevel,
    );
    if (selected === undefined) {
      throw new RangeError(
        `BigWig reduction level ${resolution.reductionLevel} is not available in this file`,
      );
    }
    return { mode: "zoom", indexOffset: selected.indexOffset };
  }

  let selected: BbiZoomHeader | undefined;
  for (const zoomHeader of zoomHeaders) {
    if (
      zoomHeader.reductionLevel <= resolution.basesPerPixel &&
      (selected === undefined || zoomHeader.reductionLevel > selected.reductionLevel)
    ) {
      selected = zoomHeader;
    }
  }
  return selected === undefined
    ? { mode: "unzoomed", indexOffset: header.unzoomedIndexOffset }
    : { mode: "zoom", indexOffset: selected.indexOffset };
}

async function readBigWig(
  url: string,
  cache: BigWigMetadataCache,
  region: GenomicRegion,
  options?: BigWigReadOptions,
): Promise<BigWigRecord[]> {
  validateRegion(region);
  const resolution = validateResolution(options?.resolution);
  const signal = options?.signal;
  throwIfAborted(signal);

  const header = await loadHeader(url, cache, signal);
  const selected = await selectResolution(url, header, cache, resolution, signal);
  throwIfAborted(signal);

  let chromosome: Chromosome | undefined;
  if (cache.chromosomes.has(region.chromosome)) {
    chromosome = cache.chromosomes.get(region.chromosome);
    throwIfAborted(signal);
  } else {
    chromosome = await lookupChromosome(url, header, region.chromosome, {
      signal,
      metadata: cache.rangeMetadata,
    });
    throwIfAborted(signal);
    cache.chromosomes.set(region.chromosome, chromosome);
  }
  if (chromosome === undefined) return [];

  let rTreeHeader = cache.rTreeHeaders.get(selected.indexOffset);
  if (rTreeHeader === undefined) {
    rTreeHeader = await readPrimaryRTreeHeader(url, header, selected.indexOffset, {
      signal,
      metadata: cache.rangeMetadata,
    });
    throwIfAborted(signal);
    cache.rTreeHeaders.set(selected.indexOffset, rTreeHeader);
  } else {
    throwIfAborted(signal);
  }

  const blocks = await readBbiDataBlocks(
    url,
    header,
    rTreeHeader,
    { chromosomeId: chromosome.id, start: region.start, end: region.end },
    { signal, metadata: cache.rangeMetadata },
  );
  throwIfAborted(signal);

  const records: BigWigRecord[] = [];
  for (const block of blocks) {
    throwIfAborted(signal);
    records.push(
      ...(selected.mode === "unzoomed"
        ? decodeBigWigValueBlock(
            block.bytes,
            header.byteOrder,
            chromosome.id,
            region.chromosome,
            region.start,
            region.end,
            signal,
          )
        : decodeBigWigZoomBlock(
            block.bytes,
            header.byteOrder,
            chromosome.id,
            region.chromosome,
            region.start,
            region.end,
            signal,
          )),
    );
    throwIfAborted(signal);
  }

  throwIfAborted(signal);
  const sortedRecords = stableSortBigWigRecords(records);
  throwIfAborted(signal);
  return sortedRecords;
}

export function createBigWigFile(options: BigWigFileOptions): BigWigFile {
  if (options === null || typeof options !== "object") {
    throw new TypeError("BigWig file options must be an object");
  }
  const url = validateHttpUrl(options.url);
  const cache: BigWigMetadataCache = {
    chromosomes: new Map(),
    rTreeHeaders: new Map(),
    rangeMetadata: {},
  };

  return {
    read(region, readOptions) {
      return readBigWig(url, cache, region, readOptions);
    },
    async getZoomLevels(readOptions) {
      const signal = readOptions?.signal;
      throwIfAborted(signal);
      const header = await loadHeader(url, cache, signal);
      const zoomHeaders = await loadZoomHeaders(url, header, cache, signal);
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
