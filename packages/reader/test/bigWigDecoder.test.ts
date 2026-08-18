import { describe, expect, it } from "vitest";
import {
  decodeBigWigValueBlock,
  decodeBigWigZoomBlock,
  stableSortBigWigRecords,
} from "../src/internal/bigWigDecoder";
import type { ByteOrder } from "../src/internal/binaryReader";

type SectionHeader = {
  chromosomeId: number;
  start: number;
  end: number;
  itemStep: number;
  itemSpan: number;
  type: number;
  itemCount: number;
};

function isLittleEndian(byteOrder: ByteOrder): boolean {
  return byteOrder === "little-endian";
}

function writeSectionHeader(bytes: Uint8Array, byteOrder: ByteOrder, header: SectionHeader): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = isLittleEndian(byteOrder);
  view.setUint32(0, header.chromosomeId, littleEndian);
  view.setUint32(4, header.start, littleEndian);
  view.setUint32(8, header.end, littleEndian);
  view.setUint32(12, header.itemStep, littleEndian);
  view.setUint32(16, header.itemSpan, littleEndian);
  view.setUint8(20, header.type);
  view.setUint8(21, 0xa5);
  view.setUint16(22, header.itemCount, littleEndian);
}

function bedGraphSection(
  byteOrder: ByteOrder,
  chromosomeId: number,
  records: Array<{ start: number; end: number; value: number }>,
): Uint8Array {
  const bytes = new Uint8Array(24 + records.length * 12);
  const view = new DataView(bytes.buffer);
  const littleEndian = isLittleEndian(byteOrder);
  writeSectionHeader(bytes, byteOrder, {
    chromosomeId,
    start: 0,
    end: 0xffffffff,
    itemStep: 0xffffffff,
    itemSpan: 0xfffffffe,
    type: 1,
    itemCount: records.length,
  });
  for (const [index, record] of records.entries()) {
    const offset = 24 + index * 12;
    view.setUint32(offset, record.start, littleEndian);
    view.setUint32(offset + 4, record.end, littleEndian);
    view.setFloat32(offset + 8, record.value, littleEndian);
  }
  return bytes;
}

function variableStepSection(
  byteOrder: ByteOrder,
  chromosomeId: number,
  itemSpan: number,
  records: Array<{ start: number; value: number }>,
): Uint8Array {
  const bytes = new Uint8Array(24 + records.length * 8);
  const view = new DataView(bytes.buffer);
  const littleEndian = isLittleEndian(byteOrder);
  writeSectionHeader(bytes, byteOrder, {
    chromosomeId,
    start: records.at(0)?.start ?? 0,
    end: records.at(-1)?.start ?? 0,
    itemStep: 0xffffffff,
    itemSpan,
    type: 2,
    itemCount: records.length,
  });
  for (const [index, record] of records.entries()) {
    const offset = 24 + index * 8;
    view.setUint32(offset, record.start, littleEndian);
    view.setFloat32(offset + 4, record.value, littleEndian);
  }
  return bytes;
}

function fixedStepSection(
  byteOrder: ByteOrder,
  chromosomeId: number,
  start: number,
  itemStep: number,
  itemSpan: number,
  values: number[],
): Uint8Array {
  const bytes = new Uint8Array(24 + values.length * 4);
  const view = new DataView(bytes.buffer);
  const littleEndian = isLittleEndian(byteOrder);
  writeSectionHeader(bytes, byteOrder, {
    chromosomeId,
    start,
    end: start + (values.length - 1) * itemStep + itemSpan,
    itemStep,
    itemSpan,
    type: 3,
    itemCount: values.length,
  });
  for (const [index, value] of values.entries()) {
    view.setFloat32(24 + index * 4, value, littleEndian);
  }
  return bytes;
}

function zoomRecord(
  byteOrder: ByteOrder,
  record: {
    chromosomeId: number;
    start: number;
    end: number;
    validCount: number;
    min: number;
    max: number;
    sum: number;
    sumSquares: number;
  },
): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  const littleEndian = isLittleEndian(byteOrder);
  view.setUint32(0, record.chromosomeId, littleEndian);
  view.setUint32(4, record.start, littleEndian);
  view.setUint32(8, record.end, littleEndian);
  view.setUint32(12, record.validCount, littleEndian);
  view.setFloat32(16, record.min, littleEndian);
  view.setFloat32(20, record.max, littleEndian);
  view.setFloat32(24, record.sum, littleEndian);
  view.setFloat32(28, record.sumSquares, littleEndian);
  return bytes;
}

function concatenate(...chunks: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

describe("BigWig value decoding", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "decodes, filters, and stably sorts all section encodings in %s order",
    (byteOrder) => {
      const block = concatenate(
        fixedStepSection(byteOrder, 1, 28, 10, 4, [-0, 7.5]),
        bedGraphSection(byteOrder, 0xffffffff, [{ start: 10, end: 20, value: 100 }]),
        bedGraphSection(byteOrder, 1, [
          { start: 20, end: 25, value: 9.5 },
          { start: 10, end: 20, value: 1.25 },
          { start: 10, end: 20, value: -2.5 },
          { start: 10, end: 20, value: 1.25 },
          { start: 0, end: 10, value: 4 },
          { start: 30, end: 40, value: 5 },
        ]),
        variableStepSection(byteOrder, 1, 5, [
          { start: 5, value: 11 },
          { start: 8, value: Math.fround(1 / 3) },
          { start: 25, value: -12.5 },
          { start: 30, value: 13 },
        ]),
      );

      const records = decodeBigWigValueBlock(block, byteOrder, 1, "ChrExactQuery", 10, 30);

      expect(stableSortBigWigRecords(records)).toEqual([
        {
          kind: "value",
          chromosome: "ChrExactQuery",
          start: 8,
          end: 13,
          value: Math.fround(1 / 3),
        },
        { kind: "value", chromosome: "ChrExactQuery", start: 10, end: 20, value: 1.25 },
        { kind: "value", chromosome: "ChrExactQuery", start: 10, end: 20, value: -2.5 },
        { kind: "value", chromosome: "ChrExactQuery", start: 10, end: 20, value: 1.25 },
        { kind: "value", chromosome: "ChrExactQuery", start: 20, end: 25, value: 9.5 },
        { kind: "value", chromosome: "ChrExactQuery", start: 25, end: 30, value: -12.5 },
        { kind: "value", chromosome: "ChrExactQuery", start: 28, end: 32, value: -0 },
      ]);
    },
  );

  it("uses unsigned section coordinates, step, and span when generating fixed-step records", () => {
    const bytes = fixedStepSection(
      "big-endian",
      0xfedcba98,
      0x80000000,
      0x80000001,
      0x80000002,
      [1, 2],
    );

    expect(
      decodeBigWigValueBlock(
        bytes,
        "big-endian",
        0xfedcba98,
        "chrUnsigned",
        0,
        Number.MAX_SAFE_INTEGER,
      ),
    ).toEqual([
      {
        kind: "value",
        chromosome: "chrUnsigned",
        start: 0x80000000,
        end: 0x1_00000002,
        value: 1,
      },
      {
        kind: "value",
        chromosome: "chrUnsigned",
        start: 0x1_00000001,
        end: 0x1_80000003,
        value: 2,
      },
    ]);
  });

  it("rejects truncated sections and unsupported section types without returning partial data", () => {
    const valid = bedGraphSection("little-endian", 1, [{ start: 1, end: 2, value: 3 }]);
    const truncated = concatenate(
      valid,
      variableStepSection("little-endian", 1, 5, [{ start: 10, value: 4 }]).subarray(0, -1),
    );
    expect(() => decodeBigWigValueBlock(truncated, "little-endian", 1, "chr1", 0, 100)).toThrow(
      RangeError,
    );

    const unsupported = new Uint8Array(24);
    writeSectionHeader(unsupported, "little-endian", {
      chromosomeId: 1,
      start: 0,
      end: 1,
      itemStep: 0,
      itemSpan: 1,
      type: 4,
      itemCount: 0,
    });
    expect(() => decodeBigWigValueBlock(unsupported, "little-endian", 1, "chr1", 0, 100)).toThrow(
      "Unsupported BigWig section type: 4",
    );
  });
});

describe("BigWig zoom decoding", () => {
  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "preserves, filters, and stably sorts summary records in %s order",
    (byteOrder) => {
      const block = concatenate(
        zoomRecord(byteOrder, {
          chromosomeId: 1,
          start: 20,
          end: 25,
          validCount: 2,
          min: -2,
          max: 8,
          sum: 6,
          sumSquares: 68,
        }),
        zoomRecord(byteOrder, {
          chromosomeId: 0xffffffff,
          start: 10,
          end: 20,
          validCount: 1,
          min: 100,
          max: 100,
          sum: 100,
          sumSquares: 10_000,
        }),
        zoomRecord(byteOrder, {
          chromosomeId: 1,
          start: 8,
          end: 12,
          validCount: 3,
          min: -12.5,
          max: 123.25,
          sum: 7,
          sumSquares: Math.fround(1 / 3),
        }),
        zoomRecord(byteOrder, {
          chromosomeId: 1,
          start: 8,
          end: 12,
          validCount: 1,
          min: -0,
          max: -0,
          sum: -0,
          sumSquares: 0,
        }),
        zoomRecord(byteOrder, {
          chromosomeId: 1,
          start: 0,
          end: 10,
          validCount: 1,
          min: 1,
          max: 1,
          sum: 1,
          sumSquares: 1,
        }),
        zoomRecord(byteOrder, {
          chromosomeId: 1,
          start: 30,
          end: 40,
          validCount: 1,
          min: 2,
          max: 2,
          sum: 2,
          sumSquares: 4,
        }),
      );

      const records = decodeBigWigZoomBlock(block, byteOrder, 1, "ChrExactQuery", 10, 30);

      expect(stableSortBigWigRecords(records)).toEqual([
        {
          kind: "summary",
          chromosome: "ChrExactQuery",
          start: 8,
          end: 12,
          validCount: 3,
          min: -12.5,
          max: 123.25,
          sum: 7,
          sumSquares: Math.fround(1 / 3),
          mean: 7 / 3,
        },
        {
          kind: "summary",
          chromosome: "ChrExactQuery",
          start: 8,
          end: 12,
          validCount: 1,
          min: -0,
          max: -0,
          sum: -0,
          sumSquares: 0,
          mean: -0,
        },
        {
          kind: "summary",
          chromosome: "ChrExactQuery",
          start: 20,
          end: 25,
          validCount: 2,
          min: -2,
          max: 8,
          sum: 6,
          sumSquares: 68,
          mean: 3,
        },
      ]);
    },
  );

  it("preserves unsigned valid counts and rejects truncated records", () => {
    const bytes = zoomRecord("big-endian", {
      chromosomeId: 0xfedcba98,
      start: 0xfffffffe,
      end: 0xffffffff,
      validCount: 0xffffffff,
      min: 1,
      max: 2,
      sum: 3,
      sumSquares: 4,
    });
    expect(
      decodeBigWigZoomBlock(bytes, "big-endian", 0xfedcba98, "chrUnsigned", 0xfffffffd, 0xffffffff),
    ).toEqual([
      {
        kind: "summary",
        chromosome: "chrUnsigned",
        start: 0xfffffffe,
        end: 0xffffffff,
        validCount: 0xffffffff,
        min: 1,
        max: 2,
        sum: 3,
        sumSquares: 4,
        mean: 3 / 0xffffffff,
      },
    ]);

    expect(() =>
      decodeBigWigZoomBlock(bytes.subarray(0, -1), "big-endian", 0xfedcba98, "chrUnsigned", 0, 1),
    ).toThrow(RangeError);
  });
});
