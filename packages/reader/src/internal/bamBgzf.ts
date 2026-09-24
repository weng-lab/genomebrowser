// Adapted from weng-lab/bigwig-reader src/bam (MIT, Copyright 2018 weng-lab).
import { gunzipSync } from "fflate";
import { RequestRangeReader } from "./requestRangeReader";

/** Request-local compressed window; never shares cancellation between reads. */
export class BamBgzfReader {
  #window: Uint8Array = new Uint8Array(0);
  #windowStart = 0n;
  constructor(private readonly reader: RequestRangeReader) {}

  async block(offset: bigint): Promise<{ bytes: Uint8Array; next: bigint }> {
    const relative = Number(offset - this.#windowStart);
    const reachesEnd =
      this.reader.resourceSize !== undefined &&
      this.#windowStart + BigInt(this.#window.length) === this.reader.resourceSize;
    if (
      relative < 0 ||
      relative + 18 > this.#window.length ||
      (relative + 65536 > this.#window.length && !reachesEnd)
    ) {
      this.#window = await this.reader.readBounded(offset, 18n, 1048576n);
      this.#windowStart = offset;
    }
    const bytes = this.#window.subarray(Number(offset - this.#windowStart));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes[0] !== 31 || bytes[1] !== 139 || bytes[2] !== 8 || bytes[3] !== 4)
      throw new Error("Expected a BGZF block");
    const extraEnd = 12 + view.getUint16(10, true);
    if (extraEnd > bytes.length) throw new Error("Truncated BGZF header");
    let size = 0;
    let position = 12;
    while (position + 4 <= extraEnd) {
      const length = view.getUint16(position + 2, true);
      if (position + 4 + length > extraEnd) throw new Error("Invalid BGZF extra field");
      if (bytes[position] === 66 && bytes[position + 1] === 67 && length === 2)
        size = view.getUint16(position + 4, true) + 1;
      position += 4 + length;
    }
    if (position !== extraEnd || size < extraEnd + 8 || size > bytes.length)
      throw new Error("Invalid or truncated BGZF block");
    const expected = view.getUint32(size - 4, true);
    if (expected > 65536) throw new Error("Invalid BGZF uncompressed size");
    const decoded = gunzipSync(bytes.subarray(0, size));
    if (decoded.length !== expected) throw new Error("Invalid BGZF uncompressed size");
    return { bytes: decoded, next: offset + BigInt(size) };
  }
}

/** Reads header fields even when they cross compressed block boundaries. */
export class BamHeaderReader {
  #bytes: Uint8Array = new Uint8Array(0);
  #position = 0;
  #next = 0n;
  constructor(private readonly bgzf: BamBgzfReader) {}

  async bytes(length: number): Promise<Uint8Array> {
    if (length < 0) throw new Error("Invalid BAM header length");
    const parts: Uint8Array[] = [];
    let remaining = length;
    while (remaining > 0) {
      if (this.#position === this.#bytes.length) {
        const block = await this.bgzf.block(this.#next);
        if (block.bytes.length === 0) throw new Error("Truncated BAM header");
        this.#bytes = block.bytes;
        this.#position = 0;
        this.#next = block.next;
      }
      const take = Math.min(remaining, this.#bytes.length - this.#position);
      parts.push(this.#bytes.subarray(this.#position, this.#position + take));
      this.#position += take;
      remaining -= take;
    }
    return joinBamBytes(parts);
  }

  async int(): Promise<number> {
    const bytes = await this.bytes(4);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getInt32(0, true);
  }
}

export function joinBamBytes(parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
