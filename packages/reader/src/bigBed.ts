import { z } from "zod";
import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { decodeBigBedBlock, stableSortBigBedRecords } from "./internal/bigBedDecoder";
import { lookupChromosome, type Chromosome } from "./internal/bbi/chromosomeTree";
import { readBbiHeader, type BbiHeader } from "./internal/bbi/commonHeader";
import { readBbiDataBlocks } from "./internal/bbi/dataBlocks";
import {
  bootstrapPrimaryRTree,
  readPrimaryRTreeRoot,
  type ParsedPrimaryRTreeNode,
  type PrimaryRTreeHeader,
} from "./internal/bbi/regionalIndex";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";
import { RequestRangeReader } from "./internal/requestRangeReader";
import { readBbiZoomHeaders, type BbiZoomHeader } from "./internal/bbi/zoomHeaders";
import { decodeBigWigZoomBlock } from "./internal/bigWigDecoder";
import type { BigWigSummaryRecord } from "./bigWig";

export const bed3Schema = z.object({});

type ProtectedBigBedField = keyof GenomicRecord | "fields";

type HasNoProtectedFields<Schema extends z.ZodObject> =
  Extract<keyof Schema["shape"], ProtectedBigBedField> extends never ? unknown : never;

type HasCompatibleUnknownKeyPolicy<Schema extends z.ZodObject> =
  Schema extends z.ZodObject<z.core.$ZodShape, infer Config>
    ? string extends keyof Config["out"]
      ? Config extends z.core.$catchall<infer Catchall>
        ? Catchall extends z.ZodNever
          ? unknown
          : never
        : never
      : unknown
    : never;

type HasOnlyStringShapeKeys<Schema extends z.ZodObject> =
  Extract<keyof Schema["shape"], symbol> extends never ? unknown : never;

type KnownSchemaOutput<Schema extends z.ZodObject> = Pick<
  z.output<Schema>,
  keyof Schema["shape"] & keyof z.output<Schema>
>;

type AwaitedSchemaOutput<Schema extends z.ZodObject> = keyof Schema["shape"] extends never
  ? Record<never, never>
  : { [Key in keyof KnownSchemaOutput<Schema>]: Awaited<KnownSchemaOutput<Schema>[Key]> };

export type BigBedRecord<Schema extends z.ZodObject> = GenomicRecord &
  AwaitedSchemaOutput<Schema> & { fields: string[] };

export type BigBedSummaryRecord = BigWigSummaryRecord;

export type BigBedMetadata = Readonly<{
  fieldCount: number;
  definedFieldCount: number;
  autoSql: string | undefined;
  zoomLevels: readonly number[];
}>;

export interface BigBedFile<Schema extends z.ZodObject> extends GenomicFile<BigBedRecord<Schema>> {
  getMetadata(options?: ReadOptions): Promise<BigBedMetadata>;
  readZoomLevel(
    region: GenomicRegion,
    reductionLevel: number,
    options?: ReadOptions,
  ): Promise<BigBedSummaryRecord[]>;
}

export type BigBedFileOptions<Schema extends z.ZodObject> = {
  url: string;
  schema: Schema &
    HasNoProtectedFields<Schema> &
    HasCompatibleUnknownKeyPolicy<Schema> &
    HasOnlyStringShapeKeys<Schema>;
};

const protectedFieldNames = new Set<ProtectedBigBedField>(["chromosome", "start", "end", "fields"]);

type BigBedMetadataCache = {
  header?: BbiHeader;
  chromosomes: Map<string, Chromosome | undefined>;
  primaryRTreeHeader?: PrimaryRTreeHeader;
  primaryRTreeRoot?: ParsedPrimaryRTreeNode;
  rangeMetadata: ExactRangeMetadata;
  metadata?: BigBedMetadata;
  zoomHeaders?: readonly BbiZoomHeader[];
  zoomIndexes: Map<number, { tree: PrimaryRTreeHeader; root?: ParsedPrimaryRTreeNode }>;
};

function isArrayIndexPropertyName(name: string): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(name)) return false;
  return BigInt(name) < 0xffff_ffffn;
}

function validateSchema(schema: unknown): asserts schema is z.ZodObject {
  if (!(schema instanceof z.ZodObject)) {
    throw new TypeError("BigBed schema must be a plain Zod 4 object schema");
  }

  const objectChecks = (schema.def as { checks?: readonly unknown[] }).checks;
  if (objectChecks !== undefined && objectChecks.length > 0) {
    throw new TypeError("BigBed schema must not have object-level refinements");
  }
  const catchall = schema.def.catchall;
  if (catchall !== undefined && !(catchall instanceof z.ZodNever)) {
    throw new TypeError("BigBed schema must use a strip or strict unknown-key policy");
  }
  if (Object.getOwnPropertySymbols(schema.shape).length > 0) {
    throw new TypeError("BigBed schema must use string property names");
  }

  for (const fieldName of Object.keys(schema.shape)) {
    if (protectedFieldNames.has(fieldName as ProtectedBigBedField)) {
      throw new TypeError(`BigBed schema must not declare reserved field ${fieldName}`);
    }
    if (isArrayIndexPropertyName(fieldName)) {
      throw new TypeError(`BigBed schema must not declare integer-index-like field ${fieldName}`);
    }
  }
}

async function prepareBigBed(url: string, cache: BigBedMetadataCache, options?: ReadOptions) {
  const signal = options?.signal;
  throwIfAborted(signal);
  const rangeOptions = { signal, metadata: cache.rangeMetadata };
  const requestReader =
    cache.header === undefined
      ? await RequestRangeReader.withPrefix(url, 64n, 2n * 1024n, rangeOptions)
      : new RequestRangeReader(url, rangeOptions);
  throwIfAborted(signal);
  let header = cache.header;
  if (header === undefined) {
    header = await readBbiHeader(url, rangeOptions, requestReader);
    throwIfAborted(signal);
    if (header.format !== "bigBed") throw new Error("Expected a BigBed file");
    cache.header = header;
  }
  return { header, requestReader, rangeOptions };
}

async function loadZoomHeaders(
  url: string,
  cache: BigBedMetadataCache,
  prepared: Awaited<ReturnType<typeof prepareBigBed>>,
) {
  if (cache.zoomHeaders !== undefined) return cache.zoomHeaders;
  const headers = await readBbiZoomHeaders(
    url,
    prepared.header,
    prepared.rangeOptions,
    prepared.requestReader,
  );
  throwIfAborted(prepared.rangeOptions.signal);
  cache.zoomHeaders = headers;
  return headers;
}

async function readAutoSql(
  offset: bigint,
  reader: RequestRangeReader,
): Promise<string | undefined> {
  if (offset === 0n) return undefined;
  const chunks: number[] = [];
  while (chunks.length < 65536) {
    const bytes = await reader.readBounded(
      offset + BigInt(chunks.length),
      1n,
      BigInt(Math.min(4096, 65536 - chunks.length)),
    );
    throwIfAborted(reader.signal);
    const end = bytes.indexOf(0);
    chunks.push(...bytes.subarray(0, end < 0 ? bytes.length : end));
    if (end >= 0) return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(chunks));
    if (reader.resourceSize !== undefined && offset + BigInt(chunks.length) >= reader.resourceSize)
      break;
  }
  throw new Error("BigBed AutoSQL must be NUL-terminated within 65536 bytes");
}

async function readBigBedMetadata(
  url: string,
  cache: BigBedMetadataCache,
  options?: ReadOptions,
): Promise<BigBedMetadata> {
  throwIfAborted(options?.signal);
  if (cache.metadata !== undefined) return cache.metadata;
  const prepared = await prepareBigBed(url, cache, options);
  const headers = await loadZoomHeaders(url, cache, prepared);
  const autoSql = await readAutoSql(prepared.header.autoSqlOffset, prepared.requestReader);
  throwIfAborted(options?.signal);
  cache.metadata = Object.freeze({
    fieldCount: prepared.header.fieldCount,
    definedFieldCount: prepared.header.definedFieldCount,
    autoSql,
    zoomLevels: Object.freeze(headers.map((h) => h.reductionLevel).sort((a, b) => a - b)),
  });
  return cache.metadata;
}

async function readBigBedZoom(
  url: string,
  cache: BigBedMetadataCache,
  region: GenomicRegion,
  reductionLevel: number,
  options?: ReadOptions,
): Promise<BigBedSummaryRecord[]> {
  validateRegion(region);
  if (!Number.isSafeInteger(reductionLevel) || reductionLevel <= 0)
    throw new RangeError("BigBed reductionLevel must be a positive safe integer");
  const prepared = await prepareBigBed(url, cache, options);
  const { header, requestReader, rangeOptions } = prepared;
  const zoom = (await loadZoomHeaders(url, cache, prepared)).find(
    (h) => h.reductionLevel === reductionLevel,
  );
  if (!zoom)
    throw new RangeError(`BigBed reduction level ${reductionLevel} is not available in this file`);
  let chromosome = cache.chromosomes.get(region.chromosome);
  if (!cache.chromosomes.has(region.chromosome)) {
    chromosome = await lookupChromosome(
      url,
      header,
      region.chromosome,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(options?.signal);
    cache.chromosomes.set(region.chromosome, chromosome);
  }
  if (!chromosome) return [];
  let index = cache.zoomIndexes.get(reductionLevel);
  if (!index) {
    const loaded = await bootstrapPrimaryRTree(
      url,
      header,
      zoom.indexOffset,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(options?.signal);
    index = { tree: loaded.tree, root: loaded.root };
    cache.zoomIndexes.set(reductionLevel, index);
  }
  if (index.root === undefined && index.tree.itemCount > 0n) {
    const root = await readPrimaryRTreeRoot(url, header, index.tree, rangeOptions, requestReader);
    throwIfAborted(options?.signal);
    index.root = root;
  }
  const blocks = await readBbiDataBlocks(
    url,
    header,
    index.tree,
    { chromosomeId: chromosome.id, start: region.start, end: region.end },
    rangeOptions,
    requestReader,
    index.root,
  );
  const records: BigBedSummaryRecord[] = [];
  for (const block of blocks) {
    throwIfAborted(options?.signal);
    records.push(
      ...decodeBigWigZoomBlock(
        block.bytes,
        header.byteOrder,
        chromosome.id,
        region.chromosome,
        region.start,
        region.end,
        options?.signal,
      ),
    );
  }
  throwIfAborted(options?.signal);
  return stableSortBigBedRecords(records);
}

async function readBigBed<Schema extends z.ZodObject>(
  url: string,
  schema: Schema,
  fieldNames: readonly string[],
  metadataCache: BigBedMetadataCache,
  region: GenomicRegion,
  options?: ReadOptions,
): Promise<BigBedRecord<Schema>[]> {
  validateRegion(region);
  const signal = options?.signal;
  const rangeOptions = { signal, metadata: metadataCache.rangeMetadata };
  throwIfAborted(signal);

  let header = metadataCache.header;
  const requestReader =
    header === undefined
      ? await RequestRangeReader.withPrefix(url, 64n, 2n * 1024n, rangeOptions)
      : new RequestRangeReader(url, rangeOptions);
  throwIfAborted(signal);
  if (header === undefined) {
    header = await readBbiHeader(url, rangeOptions, requestReader);
    throwIfAborted(signal);
    if (header.format !== "bigBed") {
      throw new Error("Expected a BigBed file");
    }
    metadataCache.header = header;
  } else {
    throwIfAborted(signal);
  }

  let chromosome: Chromosome | undefined;
  if (metadataCache.chromosomes.has(region.chromosome)) {
    chromosome = metadataCache.chromosomes.get(region.chromosome);
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
    metadataCache.chromosomes.set(region.chromosome, chromosome);
  }
  if (chromosome === undefined) return [];

  let primaryRTreeHeader = metadataCache.primaryRTreeHeader;
  let primaryRTreeRoot = metadataCache.primaryRTreeRoot;
  if (primaryRTreeHeader === undefined) {
    const bootstrap = await bootstrapPrimaryRTree(
      url,
      header,
      header.unzoomedIndexOffset,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(signal);
    primaryRTreeHeader = bootstrap.tree;
    primaryRTreeRoot = bootstrap.root;
    metadataCache.primaryRTreeHeader = primaryRTreeHeader;
    if (primaryRTreeRoot !== undefined) metadataCache.primaryRTreeRoot = primaryRTreeRoot;
  } else {
    throwIfAborted(signal);
  }
  if (primaryRTreeRoot === undefined && primaryRTreeHeader.itemCount > 0n) {
    primaryRTreeRoot = await readPrimaryRTreeRoot(
      url,
      header,
      primaryRTreeHeader,
      rangeOptions,
      requestReader,
    );
    throwIfAborted(signal);
    metadataCache.primaryRTreeRoot = primaryRTreeRoot;
  }

  const blocks = await readBbiDataBlocks(
    url,
    header,
    primaryRTreeHeader,
    { chromosomeId: chromosome.id, start: region.start, end: region.end },
    rangeOptions,
    requestReader,
    primaryRTreeRoot,
  );
  throwIfAborted(signal);

  const records: BigBedRecord<Schema>[] = [];
  for (const block of blocks) {
    throwIfAborted(signal);
    records.push(
      ...(await decodeBigBedBlock(
        block.bytes,
        header.byteOrder,
        chromosome.id,
        region.chromosome,
        region.start,
        region.end,
        schema,
        fieldNames,
        signal,
      )),
    );
    throwIfAborted(signal);
  }

  throwIfAborted(signal);
  const sortedRecords = stableSortBigBedRecords(records);
  throwIfAborted(signal);
  return sortedRecords;
}

export function createBigBedFile<Schema extends z.ZodObject>(
  options: BigBedFileOptions<Schema>,
): BigBedFile<Schema> {
  if (options === null || typeof options !== "object") {
    throw new TypeError("BigBed file options must be an object");
  }
  validateSchema(options.schema);
  const url = validateHttpUrl(options.url);
  const schema = options.schema as Schema;
  const fieldNames = Object.keys(schema.shape);
  const metadataCache: BigBedMetadataCache = {
    chromosomes: new Map(),
    rangeMetadata: {},
    zoomIndexes: new Map(),
  };

  return {
    getMetadata(options) {
      return readBigBedMetadata(url, metadataCache, options);
    },
    readZoomLevel(region, reductionLevel, options) {
      return readBigBedZoom(url, metadataCache, region, reductionLevel, options);
    },
    read(region, readOptions) {
      return readBigBed(url, schema, fieldNames, metadataCache, region, readOptions);
    },
  };
}
