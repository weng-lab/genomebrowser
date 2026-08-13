export type ByteOrder = "little-endian" | "big-endian";

export class BinaryReader {
  readonly #view: DataView;
  readonly #littleEndian: boolean;
  #position = 0;

  constructor(bytes: Uint8Array, byteOrder: ByteOrder) {
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.#littleEndian = byteOrder === "little-endian";
  }

  get position(): number {
    return this.#position;
  }

  get remaining(): number {
    return this.#view.byteLength - this.#position;
  }

  seek(position: number): void {
    if (!Number.isFinite(position) || !Number.isInteger(position)) {
      throw new TypeError("Binary reader position must be a finite integer");
    }
    if (position < 0 || position > this.#view.byteLength) {
      throw new RangeError("Binary reader position is outside the buffer");
    }

    this.#position = position;
  }

  skip(byteLength: number): void {
    if (!Number.isFinite(byteLength) || !Number.isInteger(byteLength)) {
      throw new TypeError("Binary reader skip length must be a finite integer");
    }
    if (byteLength < 0 || byteLength > this.remaining) {
      throw new RangeError("Binary reader skip exceeds the buffer");
    }

    this.#position += byteLength;
  }

  readUint8(): number {
    this.#require(1);
    const value = this.#view.getUint8(this.#position);
    this.#position += 1;
    return value;
  }

  readUint16(): number {
    this.#require(2);
    const value = this.#view.getUint16(this.#position, this.#littleEndian);
    this.#position += 2;
    return value;
  }

  readUint32(): number {
    this.#require(4);
    const value = this.#view.getUint32(this.#position, this.#littleEndian);
    this.#position += 4;
    return value;
  }

  readUint64(): bigint {
    this.#require(8);
    const value = this.#view.getBigUint64(this.#position, this.#littleEndian);
    this.#position += 8;
    return value;
  }

  #require(byteLength: number): void {
    if (byteLength > this.remaining) {
      throw new RangeError("Binary read exceeds the buffer");
    }
  }
}
