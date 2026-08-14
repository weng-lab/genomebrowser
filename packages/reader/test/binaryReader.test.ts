import { describe, expect, it } from "vitest";
import { BinaryReader, type ByteOrder } from "../src/internal/binaryReader";
import { addUint64Offset, unsignedBigIntToNumber } from "../src/internal/bigint";

describe("BinaryReader", () => {
  it.each<{ byteOrder: ByteOrder; bytes: number[] }>([
    {
      byteOrder: "little-endian",
      bytes: [
        0xab, 0x34, 0x12, 0xef, 0xcd, 0xab, 0x89, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      ],
    },
    {
      byteOrder: "big-endian",
      bytes: [
        0xab, 0x12, 0x34, 0x89, 0xab, 0xcd, 0xef, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      ],
    },
  ])("decodes unsigned values in $byteOrder order", ({ byteOrder, bytes }) => {
    const reader = new BinaryReader(Uint8Array.from(bytes), byteOrder);

    expect(reader.readUint8()).toBe(0xab);
    expect(reader.readUint16()).toBe(0x1234);
    expect(reader.readUint32()).toBe(0x89abcdef);
    expect(reader.readUint64()).toBe(0xffffffffffffffffn);
    expect(reader.position).toBe(bytes.length);
    expect(reader.remaining).toBe(0);
  });

  it.each<ByteOrder>(["little-endian", "big-endian"])(
    "decodes 32-bit floating-point values in %s order",
    (byteOrder) => {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setFloat32(0, -123.5, byteOrder === "little-endian");
      const reader = new BinaryReader(bytes, byteOrder);

      expect(reader.readFloat32()).toBe(-123.5);
      expect(reader.position).toBe(4);

      const truncated = new BinaryReader(bytes.subarray(0, 3), byteOrder);
      expect(() => truncated.readFloat32()).toThrow(RangeError);
      expect(truncated.position).toBe(0);
    },
  );

  it("keeps cursor movement and failed reads within the local byte view", () => {
    const backing = Uint8Array.from([99, 1, 2, 3, 99]);
    const reader = new BinaryReader(backing.subarray(1, 4), "little-endian");

    expect(reader.readUint8()).toBe(1);
    reader.seek(1);
    reader.skip(2);
    expect(reader.position).toBe(3);
    expect(() => reader.readUint8()).toThrow(RangeError);
    expect(reader.position).toBe(3);
    expect(() => reader.seek(4)).toThrow(RangeError);
    expect(() => reader.skip(-1)).toThrow(RangeError);

    const truncated = new BinaryReader(Uint8Array.of(1, 2, 3), "big-endian");
    expect(() => truncated.readUint32()).toThrow(RangeError);
    expect(truncated.position).toBe(0);
  });

  it("rejects unsigned bigint values that cannot be converted without precision loss", () => {
    expect(unsignedBigIntToNumber(9_007_199_254_740_991n)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => unsignedBigIntToNumber(9_007_199_254_740_992n)).toThrow(RangeError);
    expect(() => unsignedBigIntToNumber(-1n)).toThrow(RangeError);
  });

  it("rejects negative operands when adding unsigned 64-bit offsets", () => {
    expect(() => addUint64Offset(-1n, 1n)).toThrow(RangeError);
    expect(() => addUint64Offset(1n, -1n)).toThrow(RangeError);
  });
});
