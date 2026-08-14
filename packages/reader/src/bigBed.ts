import { z } from "zod";
import type { GenomicFile, GenomicRecord, GenomicRegion, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { decodeBigBedBlock, stableSortBigBedRecords } from "./internal/bigBedDecoder";
import { lookupChromosome, type Chromosome } from "./internal/bbi/chromosomeTree";
import { readBbiHeader, type BbiHeader } from "./internal/bbi/commonHeader";
import { readBbiDataBlocks } from "./internal/bbi/dataBlocks";
import { readPrimaryRTreeHeader, type PrimaryRTreeHeader } from "./internal/bbi/regionalIndex";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateBigBedRegion, validateHttpUrl } from "./internal/inputValidation";

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

type BigBedRecord<Schema extends z.ZodObject> = GenomicRecord &
  AwaitedSchemaOutput<Schema> & { fields: string[] };

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
  rangeMetadata: ExactRangeMetadata;
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

async function readBigBed<Schema extends z.ZodObject>(
  url: string,
  schema: Schema,
  fieldNames: readonly string[],
  metadataCache: BigBedMetadataCache,
  region: GenomicRegion,
  options?: ReadOptions,
): Promise<BigBedRecord<Schema>[]> {
  validateBigBedRegion(region);
  const signal = options?.signal;
  const rangeOptions = { signal, metadata: metadataCache.rangeMetadata };
  throwIfAborted(signal);

  let header = metadataCache.header;
  if (header === undefined) {
    header = await readBbiHeader(url, rangeOptions);
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
    chromosome = await lookupChromosome(url, header, region.chromosome, rangeOptions);
    throwIfAborted(signal);
    metadataCache.chromosomes.set(region.chromosome, chromosome);
  }
  if (chromosome === undefined) return [];

  let primaryRTreeHeader = metadataCache.primaryRTreeHeader;
  if (primaryRTreeHeader === undefined) {
    primaryRTreeHeader = await readPrimaryRTreeHeader(
      url,
      header,
      header.unzoomedIndexOffset,
      rangeOptions,
    );
    throwIfAborted(signal);
    metadataCache.primaryRTreeHeader = primaryRTreeHeader;
  } else {
    throwIfAborted(signal);
  }

  const blocks = await readBbiDataBlocks(
    url,
    header,
    primaryRTreeHeader,
    { chromosomeId: chromosome.id, start: region.start, end: region.end },
    rangeOptions,
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
): GenomicFile<BigBedRecord<Schema>> {
  if (options === null || typeof options !== "object") {
    throw new TypeError("BigBed file options must be an object");
  }
  validateSchema(options.schema);
  const url = validateHttpUrl(options.url);
  const schema = options.schema as Schema;
  const fieldNames = Object.keys(schema.shape);
  const metadataCache: BigBedMetadataCache = { chromosomes: new Map(), rangeMetadata: {} };

  return {
    read(region, readOptions) {
      return readBigBed(url, schema, fieldNames, metadataCache, region, readOptions);
    },
  };
}
