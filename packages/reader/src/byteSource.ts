import { GenomicReaderError, withReaderErrorContext } from "./errors";

/** Internal exact-range byte reader used by the BigBed parsers. */
export type ByteSource = {
  read(offset: number, length: number, signal?: AbortSignal): Promise<Uint8Array>;
};

type RangeResponse = {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Pick<Headers, "get">;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type RangeFetch = (url: string, init: RequestInit) => Promise<RangeResponse>;

type ExactRange = {
  readonly offset: number;
  readonly length: number;
  readonly inclusiveEnd: number;
};

/** Creates an internal HTTP source that accepts only exact partial responses. */
export function createHttpByteSource(url: string, fetchRange: RangeFetch = fetch): ByteSource {
  return {
    async read(offset, length, signal) {
      const range = validateExactRange(offset, length);
      let response: RangeResponse;

      try {
        response = await fetchRange(url, {
          headers: { Range: `bytes=${range.offset}-${range.inclusiveEnd}` },
          signal,
        });
      } catch (error) {
        if (signal?.aborted && error === signal.reason) {
          throw error;
        }

        throw withReaderErrorContext(error, "HTTP byte-range request failed.", {
          url,
          offset: range.offset,
          length: range.length,
        });
      }

      if (response.status !== 206) {
        throw unexpectedHttpStatus(url, range, response);
      }

      const contentRange = response.headers.get("Content-Range");
      validateContentRange(url, range, contentRange);

      let body: ArrayBuffer;
      try {
        body = await response.arrayBuffer();
      } catch (error) {
        if (signal?.aborted && error === signal.reason) {
          throw error;
        }

        throw withReaderErrorContext(error, "Could not read the HTTP byte-range response body.", {
          url,
          offset: range.offset,
          length: range.length,
        });
      }

      if (body.byteLength !== range.length) {
        throw new GenomicReaderError(
          `HTTP byte-range response body has ${body.byteLength} bytes; expected exactly ${range.length}.`,
          {
            context: {
              url,
              offset: range.offset,
              length: range.length,
              actualLength: body.byteLength,
            },
          },
        );
      }

      return new Uint8Array(body);
    },
  };
}

/** Creates an internal deterministic source with the same exact-range contract. */
export function createInMemoryByteSource(input: Uint8Array): ByteSource {
  const bytes = input.slice();

  return {
    async read(offset, length, signal) {
      const range = validateExactRange(offset, length);

      if (signal?.aborted) {
        throw signal.reason;
      }

      if (range.offset > bytes.byteLength || range.length > bytes.byteLength - range.offset) {
        throw new GenomicReaderError(
          `In-memory byte range ${range.offset}-${range.inclusiveEnd} exceeds the ${bytes.byteLength}-byte source.`,
          {
            context: {
              offset: range.offset,
              length: range.length,
              sourceLength: bytes.byteLength,
            },
          },
        );
      }

      return bytes.slice(range.offset, range.offset + range.length);
    },
  };
}

function validateExactRange(offset: number, length: number): ExactRange {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new GenomicReaderError(
      `Byte-range offset ${offset} is invalid; expected a non-negative safe integer.`,
      { context: { offset, length } },
    );
  }

  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new GenomicReaderError(
      `Byte-range length ${length} is invalid; expected a positive safe integer.`,
      { context: { offset, length } },
    );
  }

  if (length - 1 > Number.MAX_SAFE_INTEGER - offset) {
    throw new GenomicReaderError(
      `Byte range with offset ${offset} and length ${length} has an unsafe inclusive end.`,
      { context: { offset, length, maximum: Number.MAX_SAFE_INTEGER } },
    );
  }

  return { offset, length, inclusiveEnd: offset + length - 1 };
}

function unexpectedHttpStatus(
  url: string,
  range: ExactRange,
  response: RangeResponse,
): GenomicReaderError {
  const statusDescription = response.statusText
    ? `${response.status} ${response.statusText}`
    : String(response.status);
  let message = `HTTP byte-range request expected 206 Partial Content but received ${statusDescription}.`;

  if (response.status === 200) {
    message = "HTTP server ignored the byte range and returned 200 instead of 206 Partial Content.";
  } else if (response.status === 416) {
    message = "HTTP byte range is not satisfiable (416 Range Not Satisfiable).";
  }

  return new GenomicReaderError(message, {
    context: {
      url,
      offset: range.offset,
      length: range.length,
      status: response.status,
    },
  });
}

function validateContentRange(url: string, range: ExactRange, contentRange: string | null): void {
  if (contentRange === null) {
    throw invalidContentRange(url, range, contentRange, "header is missing");
  }

  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(contentRange);
  if (match === null) {
    throw invalidContentRange(url, range, contentRange, "header is malformed");
  }

  const actualStart = BigInt(match[1]);
  const actualEnd = BigInt(match[2]);
  const expectedStart = BigInt(range.offset);
  const expectedEnd = BigInt(range.inclusiveEnd);

  if (actualEnd < actualStart) {
    throw invalidContentRange(url, range, contentRange, "end precedes start");
  }

  if (match[3] !== "*" && BigInt(match[3]) <= actualEnd) {
    throw invalidContentRange(
      url,
      range,
      contentRange,
      "resource length does not include the range",
    );
  }

  if (actualStart !== expectedStart || actualEnd !== expectedEnd) {
    throw invalidContentRange(url, range, contentRange, "bounds do not match the request");
  }
}

function invalidContentRange(
  url: string,
  range: ExactRange,
  contentRange: string | null,
  reason: string,
): GenomicReaderError {
  return new GenomicReaderError(
    `Invalid Content-Range for requested bytes ${range.offset}-${range.inclusiveEnd}: ${reason}.`,
    {
      context: {
        url,
        offset: range.offset,
        length: range.length,
        contentRange,
      },
    },
  );
}
