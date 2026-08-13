import { describe, expect, it } from "vitest";
import { bed3Schema } from "../src/lib";
import { decodeBigBedBlock, stableSortBigBedRecords } from "../src/internal/bigBedDecoder";

const encoder = new TextEncoder();

function record(chromosomeId: number, start: number, end: number, payload: string): Uint8Array {
  const text = encoder.encode(payload);
  const bytes = new Uint8Array(13 + text.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, chromosomeId, true);
  view.setUint32(4, start, true);
  view.setUint32(8, end, true);
  bytes.set(text, 12);
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

describe("BigBed record decoding", () => {
  it("preserves payload fields, skips neighboring chromosomes, and stably orders duplicates", async () => {
    const block = concatenate(
      record(2, 8, 12, "neighbor"),
      record(1, 20, 30, "late"),
      record(1, 10, 20, ""),
      record(1, 10, 20, "first\t\tthird\t"),
      record(1, 10, 20, "duplicate"),
    );
    const decoded = await decodeBigBedBlock(
      block,
      "little-endian",
      1,
      "chr1",
      0,
      100,
      bed3Schema,
      [],
    );

    expect(stableSortBigBedRecords(decoded)).toEqual([
      { chromosome: "chr1", start: 10, end: 20, fields: [] },
      { chromosome: "chr1", start: 10, end: 20, fields: ["first", "", "third", ""] },
      { chromosome: "chr1", start: 10, end: 20, fields: ["duplicate"] },
      { chromosome: "chr1", start: 20, end: 30, fields: ["late"] },
    ]);
  });

  it("rejects truncated records and missing payload terminators without partial success", async () => {
    await expect(
      decodeBigBedBlock(Uint8Array.of(1, 0, 0), "little-endian", 1, "chr1", 0, 100, bed3Schema, []),
    ).rejects.toThrow(RangeError);

    const unterminated = record(1, 10, 20, "payload").subarray(0, -1);
    await expect(
      decodeBigBedBlock(unterminated, "little-endian", 1, "chr1", 0, 100, bed3Schema, []),
    ).rejects.toThrow("missing its NUL terminator");
  });

  it("uses unsigned coordinates and detected big-endian byte order", async () => {
    const bytes = record(1, 0, 0, "field");
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0xfedcba98, false);
    view.setUint32(4, 0xfffffffe, false);
    view.setUint32(8, 0xffffffff, false);

    await expect(
      decodeBigBedBlock(
        bytes,
        "big-endian",
        0xfedcba98,
        "chrUnsigned",
        0xfffffffd,
        0xffffffff,
        bed3Schema,
        [],
      ),
    ).resolves.toEqual([
      {
        chromosome: "chrUnsigned",
        start: 0xfffffffe,
        end: 0xffffffff,
        fields: ["field"],
      },
    ]);
  });
});
