import { throwIfAborted } from "./abort";
import { unsignedBigIntToNumber } from "./bigint";

const MAX_UINT64 = 18_446_744_073_709_551_615n;
const CONTENT_RANGE_PATTERN = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i;

function validateRange(offset: bigint, length: bigint): { end: bigint; byteLength: number } {
  if (offset < 0n || offset > MAX_UINT64) {
    throw new RangeError("Range offset must be an unsigned 64-bit value");
  }
  if (length <= 0n) {
    throw new RangeError("Range length must be positive");
  }

  const byteLength = unsignedBigIntToNumber(length, "Range length");
  const end = offset + length - 1n;
  if (end > MAX_UINT64) {
    throw new RangeError("Range end exceeds the unsigned 64-bit limit");
  }

  return { end, byteLength };
}

export type ExactRangeMetadata = {
  resourceSize?: bigint;
};

export type ExactRangeOptions = {
  signal?: AbortSignal;
  metadata?: ExactRangeMetadata;
};

type ParsedContentRange = {
  start: bigint;
  end: bigint;
  completeLength?: bigint;
};

function parseContentRange(contentRange: string | null): ParsedContentRange | undefined {
  // Browsers hide Content-Range unless the server exposes it through CORS. In that case,
  // readExactRange still requires a 206 response and an exact body length.
  if (contentRange === null) return undefined;

  const match = CONTENT_RANGE_PATTERN.exec(contentRange);
  if (match === null) {
    throw new Error("Partial response has an invalid Content-Range header");
  }

  const start = BigInt(match[1]);
  const end = BigInt(match[2]);
  const completeLength = match[3] === "*" ? undefined : BigInt(match[3]);

  if (completeLength !== undefined && completeLength <= end) {
    throw new Error("Partial response has an inconsistent complete length");
  }
  return { start, end, completeLength };
}

function validateContentRange(
  contentRange: ParsedContentRange | undefined,
  offset: bigint,
  end: bigint,
): bigint | undefined {
  if (contentRange === undefined) return undefined;
  if (contentRange.start !== offset || contentRange.end !== end) {
    throw new Error("Partial response does not match the requested byte range");
  }
  return contentRange.completeLength;
}

function retainResourceSize(resourceSize: bigint | undefined, options?: ExactRangeOptions): void {
  if (resourceSize !== undefined && options?.metadata !== undefined) {
    options.metadata.resourceSize ??= resourceSize;
  }
}

export async function readExactRange(
  url: string,
  offset: bigint,
  length: bigint,
  options?: ExactRangeOptions,
): Promise<Uint8Array> {
  const signal = options?.signal;
  const { end, byteLength } = validateRange(offset, length);
  throwIfAborted(signal);

  const response = await fetch(url, {
    headers: { Range: `bytes=${offset}-${end}` },
    signal,
  });
  throwIfAborted(signal);

  if (response.status !== 206) {
    throw new Error(`Expected a 206 Partial Content response, received ${response.status}`);
  }
  if (response.headers.has("Content-Encoding")) {
    throw new Error("Partial response must not use Content-Encoding");
  }
  const contentRange = parseContentRange(response.headers.get("Content-Range"));
  const resourceSize = validateContentRange(contentRange, offset, end);

  throwIfAborted(signal);
  const body = await response.arrayBuffer();
  throwIfAborted(signal);

  if (body.byteLength !== byteLength) {
    throw new Error(
      `Partial response body has ${body.byteLength} bytes; expected exactly ${byteLength}`,
    );
  }

  retainResourceSize(resourceSize, options);

  return new Uint8Array(body);
}

export async function readBoundedRange(
  url: string,
  offset: bigint,
  minLength: bigint,
  maxLength: bigint,
  options?: ExactRangeOptions,
): Promise<Uint8Array> {
  if (minLength <= 0n) {
    throw new RangeError("Minimum range length must be positive");
  }
  const minimumByteLength = unsignedBigIntToNumber(minLength, "Minimum range length");
  const { end, byteLength: maximumByteLength } = validateRange(offset, maxLength);
  if (minLength > maxLength) {
    throw new RangeError("Minimum range length must not exceed maximum range length");
  }

  const signal = options?.signal;
  throwIfAborted(signal);
  const response = await fetch(url, {
    headers: { Range: `bytes=${offset}-${end}` },
    signal,
  });
  throwIfAborted(signal);

  if (response.status !== 206) {
    throw new Error(`Expected a 206 Partial Content response, received ${response.status}`);
  }
  if (response.headers.has("Content-Encoding")) {
    throw new Error("Partial response must not use Content-Encoding");
  }
  const contentRange = parseContentRange(response.headers.get("Content-Range"));

  throwIfAborted(signal);
  const body = await response.arrayBuffer();
  throwIfAborted(signal);

  if (body.byteLength < minimumByteLength || body.byteLength > maximumByteLength) {
    throw new Error(
      `Partial response body has ${body.byteLength} bytes; expected between ${minimumByteLength} and ${maximumByteLength}`,
    );
  }

  const responseEnd = offset + BigInt(body.byteLength) - 1n;
  const resourceSize = validateContentRange(contentRange, offset, responseEnd);
  retainResourceSize(resourceSize, options);
  return new Uint8Array(body);
}
