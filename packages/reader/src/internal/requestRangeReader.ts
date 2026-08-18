import { throwIfAborted } from "./abort";
import { readBoundedRange, readExactRange, type ExactRangeOptions } from "./httpRange";

export class RequestRangeReader {
  readonly #url: string;
  readonly #options: ExactRangeOptions | undefined;
  readonly #prefix: Uint8Array | undefined;

  constructor(url: string, options?: ExactRangeOptions, prefix?: Uint8Array) {
    this.#url = url;
    this.#options = options;
    this.#prefix = prefix;
  }

  static async withPrefix(
    url: string,
    minLength: bigint,
    maxLength: bigint,
    options?: ExactRangeOptions,
  ): Promise<RequestRangeReader> {
    const prefix = await readBoundedRange(url, 0n, minLength, maxLength, options);
    return new RequestRangeReader(url, options, prefix);
  }

  get resourceSize(): bigint | undefined {
    return this.#options?.metadata?.resourceSize;
  }

  get signal(): AbortSignal | undefined {
    return this.#options?.signal;
  }

  async readExact(offset: bigint, length: bigint): Promise<Uint8Array> {
    throwIfAborted(this.signal);
    const covered = this.#coveredSlice(offset, length, length);
    if (covered !== undefined) return covered;
    return readExactRange(this.#url, offset, length, this.#options);
  }

  async readBounded(offset: bigint, minLength: bigint, maxLength: bigint): Promise<Uint8Array> {
    throwIfAborted(this.signal);
    const covered = this.#coveredSlice(offset, minLength, maxLength);
    if (covered !== undefined) return covered;
    return readBoundedRange(this.#url, offset, minLength, maxLength, this.#options);
  }

  #coveredSlice(offset: bigint, minLength: bigint, maxLength: bigint): Uint8Array | undefined {
    if (
      this.#prefix === undefined ||
      offset < 0n ||
      minLength <= 0n ||
      maxLength < minLength ||
      offset >= BigInt(this.#prefix.byteLength)
    ) {
      return undefined;
    }

    const availableLength = BigInt(this.#prefix.byteLength) - offset;
    if (availableLength < minLength) return undefined;
    const byteLength = availableLength < maxLength ? availableLength : maxLength;
    const start = Number(offset);
    return this.#prefix.slice(start, start + Number(byteLength));
  }
}
