import type { GenomicRecord } from "../genomicFile";
import { throwIfAborted } from "./abort";
import { BinaryReader, type ByteOrder } from "./binaryReader";

const BED_GRAPH_SECTION_TYPE = 1;
const VARIABLE_STEP_SECTION_TYPE = 2;
const FIXED_STEP_SECTION_TYPE = 3;

type BigWigSectionHeader = {
  chromosomeId: number;
  start: number;
  end: number;
  itemStep: number;
  itemSpan: number;
  type: number;
  itemCount: number;
};

export type DecodedBigWigValueRecord = GenomicRecord & {
  kind: "value";
  value: number;
};

export type DecodedBigWigSummaryRecord = GenomicRecord & {
  kind: "summary";
  validCount: number;
  min: number;
  max: number;
  sum: number;
  sumSquares: number;
  mean: number;
};

export type DecodedBigWigRecord = DecodedBigWigValueRecord | DecodedBigWigSummaryRecord;

function readSectionHeader(reader: BinaryReader): BigWigSectionHeader {
  const chromosomeId = reader.readUint32();
  const start = reader.readUint32();
  const end = reader.readUint32();
  const itemStep = reader.readUint32();
  const itemSpan = reader.readUint32();
  const type = reader.readUint8();
  reader.readUint8(); // Reserved.
  const itemCount = reader.readUint16();

  return { chromosomeId, start, end, itemStep, itemSpan, type, itemCount };
}

function overlaps(start: number, end: number, regionStart: number, regionEnd: number): boolean {
  return start < regionEnd && end > regionStart;
}

function addValueRecord(
  records: DecodedBigWigValueRecord[],
  header: BigWigSectionHeader,
  chromosomeId: number,
  chromosome: string,
  regionStart: number,
  regionEnd: number,
  start: number,
  end: number,
  value: number,
): void {
  if (header.chromosomeId !== chromosomeId || !overlaps(start, end, regionStart, regionEnd)) {
    return;
  }

  records.push({ kind: "value", chromosome, start, end, value });
}

export function decodeBigWigValueBlock(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  chromosomeId: number,
  chromosome: string,
  regionStart: number,
  regionEnd: number,
  signal?: AbortSignal,
): DecodedBigWigValueRecord[] {
  throwIfAborted(signal);
  const reader = new BinaryReader(bytes, byteOrder);
  const records: DecodedBigWigValueRecord[] = [];

  while (reader.remaining > 0) {
    throwIfAborted(signal);
    const header = readSectionHeader(reader);

    if (
      header.type !== BED_GRAPH_SECTION_TYPE &&
      header.type !== VARIABLE_STEP_SECTION_TYPE &&
      header.type !== FIXED_STEP_SECTION_TYPE
    ) {
      throw new Error(`Unsupported BigWig section type: ${header.type}`);
    }

    for (let itemIndex = 0; itemIndex < header.itemCount; itemIndex += 1) {
      throwIfAborted(signal);

      if (header.type === BED_GRAPH_SECTION_TYPE) {
        const start = reader.readUint32();
        const end = reader.readUint32();
        const value = reader.readFloat32();
        addValueRecord(
          records,
          header,
          chromosomeId,
          chromosome,
          regionStart,
          regionEnd,
          start,
          end,
          value,
        );
      } else if (header.type === VARIABLE_STEP_SECTION_TYPE) {
        const start = reader.readUint32();
        const value = reader.readFloat32();
        addValueRecord(
          records,
          header,
          chromosomeId,
          chromosome,
          regionStart,
          regionEnd,
          start,
          start + header.itemSpan,
          value,
        );
      } else {
        const start = header.start + itemIndex * header.itemStep;
        const value = reader.readFloat32();
        addValueRecord(
          records,
          header,
          chromosomeId,
          chromosome,
          regionStart,
          regionEnd,
          start,
          start + header.itemSpan,
          value,
        );
      }

      throwIfAborted(signal);
    }
  }

  return records;
}

export function decodeBigWigZoomBlock(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  chromosomeId: number,
  chromosome: string,
  regionStart: number,
  regionEnd: number,
  signal?: AbortSignal,
): DecodedBigWigSummaryRecord[] {
  throwIfAborted(signal);
  const reader = new BinaryReader(bytes, byteOrder);
  const records: DecodedBigWigSummaryRecord[] = [];

  while (reader.remaining > 0) {
    throwIfAborted(signal);
    const recordChromosomeId = reader.readUint32();
    const start = reader.readUint32();
    const end = reader.readUint32();
    const validCount = reader.readUint32();
    const min = reader.readFloat32();
    const max = reader.readFloat32();
    const sum = reader.readFloat32();
    const sumSquares = reader.readFloat32();

    if (recordChromosomeId === chromosomeId && overlaps(start, end, regionStart, regionEnd)) {
      records.push({
        kind: "summary",
        chromosome,
        start,
        end,
        validCount,
        min,
        max,
        sum,
        sumSquares,
        mean: sum / validCount,
      });
    }
    throwIfAborted(signal);
  }

  return records;
}

function compareRecords(left: GenomicRecord, right: GenomicRecord): number {
  if (left.chromosome !== right.chromosome) {
    return left.chromosome < right.chromosome ? -1 : 1;
  }
  return left.start - right.start || left.end - right.end;
}

export function stableSortBigWigRecords<Output extends GenomicRecord>(
  records: readonly Output[],
): Output[] {
  return records
    .map((record, sourceIndex) => ({ record, sourceIndex }))
    .sort(
      (left, right) =>
        compareRecords(left.record, right.record) || left.sourceIndex - right.sourceIndex,
    )
    .map(({ record }) => record);
}
