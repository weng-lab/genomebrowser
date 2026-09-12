import { z } from "zod";
import { BigBedParseError } from "../bigBedParseError";
import type { GenomicRecord } from "../genomicFile";
import { throwIfAborted } from "./abort";
import { BinaryReader, type ByteOrder } from "./binaryReader";

type AwaitedSchemaOutput<Schema extends z.ZodObject> = {
  [Key in keyof z.output<Schema>]: Awaited<z.output<Schema>[Key]>;
};

type ParsedBigBedRecord<Schema extends z.ZodObject> = GenomicRecord &
  AwaitedSchemaOutput<Schema> & { fields: string[] };

function defineOwnProperty(object: object, name: string, value: unknown): void {
  Object.defineProperty(object, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function compareRecords(left: GenomicRecord, right: GenomicRecord): number {
  if (left.chromosome !== right.chromosome) {
    return left.chromosome < right.chromosome ? -1 : 1;
  }
  return left.start - right.start || left.end - right.end;
}

export async function decodeBigBedBlock<Schema extends z.ZodObject>(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  chromosomeId: number,
  chromosome: string,
  regionStart: number,
  regionEnd: number,
  schema: Schema,
  fieldNames: readonly string[],
  signal?: AbortSignal,
): Promise<ParsedBigBedRecord<Schema>[]> {
  throwIfAborted(signal);
  const reader = new BinaryReader(bytes, byteOrder);
  const decoder = new TextDecoder();
  const records: ParsedBigBedRecord<Schema>[] = [];

  while (reader.remaining > 0) {
    throwIfAborted(signal);
    const recordChromosomeId = reader.readUint32();
    const start = reader.readUint32();
    const end = reader.readUint32();
    const payloadStart = reader.position;
    let payloadEnd = payloadStart;
    while (payloadEnd < bytes.byteLength && bytes[payloadEnd] !== 0) payloadEnd += 1;
    if (payloadEnd === bytes.byteLength) {
      throw new Error("BigBed record payload is missing its NUL terminator");
    }
    reader.seek(payloadEnd + 1);

    if (recordChromosomeId !== chromosomeId || start >= regionEnd || end <= regionStart) continue;

    const payload = decoder.decode(bytes.subarray(payloadStart, payloadEnd));
    const tokens = payload.length === 0 ? [] : payload.split("\t");
    throwIfAborted(signal);
    if (tokens.length < fieldNames.length) {
      const result = z.array(z.string()).min(fieldNames.length).safeParse(tokens);
      if (!result.success) {
        throw new BigBedParseError(result.error, {
          region: { chromosome, start, end },
          column: tokens.length + 4,
          field: fieldNames[tokens.length]!,
          expectedColumns: fieldNames.length + 3,
          actualColumns: tokens.length + 3,
        });
      }
    }

    const record: object = {};
    defineOwnProperty(record, "chromosome", chromosome);
    defineOwnProperty(record, "start", start);
    defineOwnProperty(record, "end", end);
    for (let index = 0; index < fieldNames.length; index += 1) {
      const fieldName = fieldNames[index]!;
      throwIfAborted(signal);
      const result = await schema.shape[fieldName]!.safeParseAsync(tokens[index]!);
      if (!result.success) {
        throw new BigBedParseError(result.error, {
          region: { chromosome, start, end },
          column: index + 4,
          field: fieldName,
          value: tokens[index]!,
          expectedColumns: fieldNames.length + 3,
          actualColumns: tokens.length + 3,
        });
      }
      const parsed = result.data;
      throwIfAborted(signal);
      defineOwnProperty(record, fieldName, parsed);
    }
    defineOwnProperty(record, "fields", tokens.slice(fieldNames.length));
    records.push(record as ParsedBigBedRecord<Schema>);
    throwIfAborted(signal);
  }

  return records;
}

export function stableSortBigBedRecords<Output extends GenomicRecord>(records: Output[]): Output[] {
  return records
    .map((record, sourceIndex) => ({ record, sourceIndex }))
    .sort(
      (left, right) =>
        compareRecords(left.record, right.record) || left.sourceIndex - right.sourceIndex,
    )
    .map(({ record }) => record);
}
