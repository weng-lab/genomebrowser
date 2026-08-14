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

function validateContentRange(
  contentRange: string | null,
  offset: bigint,
  end: bigint,
): bigint | undefined {
  // Browsers hide Content-Range unless the server exposes it through CORS. In that case,
  // readExactRange still requires a 206 response and an exact body length.
  if (contentRange === null) return undefined;

  const match = CONTENT_RANGE_PATTERN.exec(contentRange);
  if (match === null) {
    throw new Error("Partial response has an invalid Content-Range header");
  }

  const responseStart = BigInt(match[1]);
  const responseEnd = BigInt(match[2]);
  const completeLength = match[3] === "*" ? undefined : BigInt(match[3]);

  if (responseStart !== offset || responseEnd !== end) {
    throw new Error("Partial response does not match the requested byte range");
  }
  if (completeLength !== undefined && completeLength <= responseEnd) {
    throw new Error("Partial response has an inconsistent complete length");
  }
  return completeLength;
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
  const resourceSize = validateContentRange(response.headers.get("Content-Range"), offset, end);

  throwIfAborted(signal);
  const body = await response.arrayBuffer();
  throwIfAborted(signal);

  if (body.byteLength !== byteLength) {
    throw new Error(
      `Partial response body has ${body.byteLength} bytes; expected exactly ${byteLength}`,
    );
  }

  if (resourceSize !== undefined && options?.metadata !== undefined) {
    options.metadata.resourceSize ??= resourceSize;
  }

  return new Uint8Array(body);
}
