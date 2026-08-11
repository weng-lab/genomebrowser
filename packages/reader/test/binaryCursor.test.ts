import { describe, expect, it } from "vitest";
import { BinaryCursor, type ByteOrder } from "../src/binaryCursor";
import { BinaryParseError, GenomicReaderError, withReaderErrorContext } from "../src/errors";

const primitiveByteLength = 33;

describe.each(["little", "big"] satisfies ByteOrder[])("BinaryCursor (%s endian)", (byteOrder) => {
  const littleEndian = byteOrder === "little";

  it("reads every numeric primitive in order and advances by its width", () => {
    const backing = new Uint8Array(primitiveByteLength + 4);
    const bytes = backing.subarray(2, 2 + primitiveByteLength);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    view.setUint8(offset, 0xab);
    offset += 1;
    view.setInt16(offset, -12_345, littleEndian);
    offset += 2;
    view.setUint16(offset, 54_321, littleEndian);
    offset += 2;
    view.setInt32(offset, -1_234_567_890, littleEndian);
    offset += 4;
    view.setUint32(offset, 4_000_000_000, littleEndian);
    offset += 4;
    view.setBigUint64(offset, BigInt(Number.MAX_SAFE_INTEGER), littleEndian);
    offset += 8;
    view.setFloat32(offset, 1.25, littleEndian);
    offset += 4;
    view.setFloat64(offset, -Math.PI, littleEndian);

    const cursor = new BinaryCursor(bytes, byteOrder, "primitive fixture");

    expect(cursor.readUint8()).toBe(0xab);
    expect(cursor.position).toBe(1);
    expect(cursor.readInt16()).toBe(-12_345);
    expect(cursor.position).toBe(3);
    expect(cursor.readUint16()).toBe(54_321);
    expect(cursor.position).toBe(5);
    expect(cursor.readInt32()).toBe(-1_234_567_890);
    expect(cursor.position).toBe(9);
    expect(cursor.readUint32()).toBe(4_000_000_000);
    expect(cursor.position).toBe(13);
    expect(cursor.readUint64()).toBe(Number.MAX_SAFE_INTEGER);
    expect(cursor.position).toBe(21);
    expect(cursor.readFloat32()).toBe(1.25);
    expect(cursor.position).toBe(25);
    expect(cursor.readFloat64()).toBe(-Math.PI);
    expect(cursor.position).toBe(primitiveByteLength);
    expect(cursor.remaining).toBe(0);
  });

  it("rejects the first uint64 above MAX_SAFE_INTEGER without advancing", () => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, BigInt(Number.MAX_SAFE_INTEGER) + 1n, littleEndian);
    const cursor = new BinaryCursor(bytes, byteOrder, "index offset");

    expect(() => cursor.readUint64()).toThrowError(BinaryParseError);
    expect(() => cursor.readUint64()).toThrow(/index offset.*9007199254740992.*safe/);
    expect(cursor.position).toBe(0);
    expect(cursor.remaining).toBe(8);
  });
});

describe("BinaryCursor bounds and strings", () => {
  it.each([
    ["uint8", 0, (cursor: BinaryCursor) => cursor.readUint8()],
    ["int16", 1, (cursor: BinaryCursor) => cursor.readInt16()],
    ["uint16", 1, (cursor: BinaryCursor) => cursor.readUint16()],
    ["int32", 3, (cursor: BinaryCursor) => cursor.readInt32()],
    ["uint32", 3, (cursor: BinaryCursor) => cursor.readUint32()],
    ["uint64", 7, (cursor: BinaryCursor) => cursor.readUint64()],
    ["float32", 3, (cursor: BinaryCursor) => cursor.readFloat32()],
    ["float64", 7, (cursor: BinaryCursor) => cursor.readFloat64()],
  ])("reports contextual truncation for %s without advancing", (operation, length, read) => {
    const cursor = new BinaryCursor(new Uint8Array(length), "little", "truncated node");

    let failure: unknown;
    try {
      read(cursor);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(BinaryParseError);
    expect(failure).toMatchObject({
      context: {
        source: "truncated node",
        operation,
        offset: 0,
        availableBytes: length,
      },
    });
    expect(cursor.position).toBe(0);
  });

  it("reads fixed-length, NUL-terminated, and remaining strings with exact advancement", () => {
    const bytes = Uint8Array.from([107, 101, 121, 0, 0, 110, 97, 109, 101, 0, 114, 101, 115, 116]);
    const cursor = new BinaryCursor(bytes, "big");

    expect(cursor.readFixedString(5)).toBe("key");
    expect(cursor.position).toBe(5);
    expect(cursor.readNullTerminatedString()).toBe("name");
    expect(cursor.position).toBe(10);
    expect(cursor.readRemainingString()).toBe("rest");
    expect(cursor.position).toBe(bytes.length);
  });

  it("fails fixed-length reads and skips that exceed the remaining bytes", () => {
    const fixedCursor = new BinaryCursor(Uint8Array.of(97, 98), "little", "fixed key");
    const skipCursor = new BinaryCursor(Uint8Array.of(1), "little", "node padding");

    expect(() => fixedCursor.readFixedString(3)).toThrow(/fixed key.*requested 3.*only 2/);
    expect(() => skipCursor.skip(2)).toThrow(/node padding.*requested 2.*only 1/);
    expect(fixedCursor.position).toBe(0);
    expect(skipCursor.position).toBe(0);
  });

  it("requires a NUL terminator and leaves the cursor unchanged when it is missing", () => {
    const cursor = new BinaryCursor(Uint8Array.of(98, 97, 100), "little", "record text");

    expect(() => cursor.readNullTerminatedString()).toThrowError(BinaryParseError);
    expect(() => cursor.readNullTerminatedString()).toThrow(/record text.*no terminator.*3/);
    expect(cursor.position).toBe(0);
  });
});

describe("reader errors", () => {
  it("preserves causes and context while retaining native abort identity", () => {
    const cause = new Error("socket closed");
    const wrapped = withReaderErrorContext(cause, "Could not read header", {
      url: "https://example.test/data.bb",
      offset: 64,
    });

    expect(wrapped).toBeInstanceOf(GenomicReaderError);
    expect(wrapped).toMatchObject({
      message: "Could not read header",
      cause,
      context: { url: "https://example.test/data.bb", offset: 64 },
    });

    const controller = new AbortController();
    controller.abort();
    const abort = controller.signal.reason;

    expect(abort.name).toBe("AbortError");
    expect(withReaderErrorContext(abort, "Could not read header")).toBe(abort);
  });
});
