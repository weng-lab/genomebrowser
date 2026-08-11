import { BinaryParseError } from "./errors";

export type ByteOrder = "little" | "big";

const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);

/** Bounds-checked cursor for the byte layouts used by BigBed files. */
export class BinaryCursor {
  readonly #bytes: Uint8Array;
  readonly #view: DataView;
  readonly #littleEndian: boolean;
  readonly #source: string;
  #position = 0;

  constructor(bytes: Uint8Array, byteOrder: ByteOrder, source = "binary data") {
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.#littleEndian = byteOrder === "little";
    this.#source = source;
  }

  get position(): number {
    return this.#position;
  }

  get remaining(): number {
    return this.#bytes.byteLength - this.#position;
  }

  readUint8(): number {
    return this.#readNumber("uint8", 1, (offset) => this.#view.getUint8(offset));
  }

  readInt16(): number {
    return this.#readNumber("int16", 2, (offset) =>
      this.#view.getInt16(offset, this.#littleEndian),
    );
  }

  readUint16(): number {
    return this.#readNumber("uint16", 2, (offset) =>
      this.#view.getUint16(offset, this.#littleEndian),
    );
  }

  readInt32(): number {
    return this.#readNumber("int32", 4, (offset) =>
      this.#view.getInt32(offset, this.#littleEndian),
    );
  }

  readUint32(): number {
    return this.#readNumber("uint32", 4, (offset) =>
      this.#view.getUint32(offset, this.#littleEndian),
    );
  }

  readUint64(): number {
    const offset = this.#requireAvailable(8, "uint64");
    const value = this.#view.getBigUint64(offset, this.#littleEndian);

    if (value > maxSafeInteger) {
      throw new BinaryParseError(
        `Cannot read uint64 at offset ${offset} in ${this.#source}: ${value} is not a safe JavaScript integer.`,
        {
          context: {
            source: this.#source,
            operation: "uint64",
            offset,
            value,
            maximum: Number.MAX_SAFE_INTEGER,
          },
        },
      );
    }

    this.#position += 8;
    return Number(value);
  }

  readFloat32(): number {
    return this.#readNumber("float32", 4, (offset) =>
      this.#view.getFloat32(offset, this.#littleEndian),
    );
  }

  readFloat64(): number {
    return this.#readNumber("float64", 8, (offset) =>
      this.#view.getFloat64(offset, this.#littleEndian),
    );
  }

  readFixedString(length: number): string {
    const offset = this.#requireAvailable(length, "fixed-length string");
    const end = offset + length;
    let contentEnd = end;

    for (let index = offset; index < end; index += 1) {
      if (this.#bytes[index] === 0) {
        contentEnd = index;
        break;
      }
    }

    const value = decodeBytes(this.#bytes, offset, contentEnd);
    this.#position = end;
    return value;
  }

  readNullTerminatedString(): string {
    const offset = this.#position;
    const terminator = this.#bytes.indexOf(0, offset);

    if (terminator === -1) {
      throw new BinaryParseError(
        `Cannot read NUL-terminated string at offset ${offset} in ${this.#source}: no terminator in ${this.remaining} remaining bytes.`,
        {
          context: {
            source: this.#source,
            operation: "NUL-terminated string",
            offset,
            availableBytes: this.remaining,
          },
        },
      );
    }

    const value = decodeBytes(this.#bytes, offset, terminator);
    this.#position = terminator + 1;
    return value;
  }

  readRemainingString(): string {
    const offset = this.#position;
    const value = decodeBytes(this.#bytes, offset, this.#bytes.byteLength);
    this.#position = this.#bytes.byteLength;
    return value;
  }

  skip(length: number): void {
    this.#position = this.#requireAvailable(length, "skip") + length;
  }

  #readNumber(operation: string, width: number, read: (offset: number) => number): number {
    const offset = this.#requireAvailable(width, operation);
    const value = read(offset);
    this.#position += width;
    return value;
  }

  #requireAvailable(length: number, operation: string): number {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new BinaryParseError(
        `Cannot read ${operation} at offset ${this.#position} in ${this.#source}: requested byte length ${length} is not a non-negative safe integer.`,
        {
          context: {
            source: this.#source,
            operation,
            offset: this.#position,
            requestedBytes: length,
            availableBytes: this.remaining,
          },
        },
      );
    }

    if (length > this.remaining) {
      throw new BinaryParseError(
        `Cannot read ${operation} at offset ${this.#position} in ${this.#source}: requested ${length} bytes but only ${this.remaining} remain.`,
        {
          context: {
            source: this.#source,
            operation,
            offset: this.#position,
            requestedBytes: length,
            availableBytes: this.remaining,
          },
        },
      );
    }

    return this.#position;
  }
}

function decodeBytes(bytes: Uint8Array, start: number, end: number): string {
  let value = "";
  for (let index = start; index < end; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}
