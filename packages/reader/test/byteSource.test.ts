import { describe, expect, it } from "vitest";
import { createHttpByteSource, createInMemoryByteSource } from "../src/byteSource";
import { GenomicReaderError } from "../src/errors";

const url = "https://example.test/data.bb";

function bytes(...values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

function partialResponse(contentRange: string | null, body: ArrayBuffer = bytes(4, 5, 6)) {
  return {
    status: 206,
    statusText: "Partial Content",
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-range" ? contentRange : null;
      },
    },
    async arrayBuffer() {
      return body;
    },
  };
}

describe("HTTP byte source", () => {
  it("requests and returns an exact inclusive range while forwarding cancellation", async () => {
    const controller = new AbortController();
    let requestedUrl: string | undefined;
    let requestInit: RequestInit | undefined;
    const source = createHttpByteSource(url, async (input, init) => {
      requestedUrl = input;
      requestInit = init;
      return partialResponse("bytes 4-6/20");
    });

    await expect(source.read(4, 3, controller.signal)).resolves.toEqual(Uint8Array.of(4, 5, 6));
    expect(requestedUrl).toBe(url);
    expect(new Headers(requestInit?.headers).get("Range")).toBe("bytes=4-6");
    expect(requestInit?.signal).toBe(controller.signal);
  });

  it.each([
    [200, "OK", /ignored.*200.*206/i],
    [416, "Range Not Satisfiable", /not satisfiable.*416/i],
    [503, "Service Unavailable", /expected 206.*503/i],
  ])("rejects HTTP %i without buffering its body", async (status, statusText, message) => {
    let bodyReads = 0;
    const source = createHttpByteSource(url, async () => ({
      status,
      statusText,
      headers: { get: () => null },
      async arrayBuffer() {
        bodyReads += 1;
        return bytes(1);
      },
    }));

    await expect(source.read(0, 1)).rejects.toThrow(message);
    expect(bodyReads).toBe(0);
  });

  it.each([
    [null, /missing/i],
    ["not a content range", /malformed/i],
    ["bytes 5-7/20", /bounds do not match/i],
    ["bytes 4-6/6", /resource length/i],
  ])("rejects inconsistent Content-Range %s before reading the body", async (header, message) => {
    let bodyReads = 0;
    const response = partialResponse(header);
    const source = createHttpByteSource(url, async () => ({
      ...response,
      async arrayBuffer() {
        bodyReads += 1;
        return response.arrayBuffer();
      },
    }));

    await expect(source.read(4, 3)).rejects.toThrow(message);
    expect(bodyReads).toBe(0);
  });

  it.each([
    [bytes(4, 5), 2],
    [bytes(4, 5, 6, 7), 4],
  ])("rejects a response body with %i bytes", async (body, actualLength) => {
    const source = createHttpByteSource(url, async () => partialResponse("bytes 4-6/20", body));

    await expect(source.read(4, 3)).rejects.toMatchObject({
      message: expect.stringMatching(/expected exactly 3/),
      context: { actualLength },
    });
  });

  it("adds range context to network failures", async () => {
    const cause = new TypeError("Failed to fetch");
    const source = createHttpByteSource(url, async () => {
      throw cause;
    });

    await expect(source.read(8, 2)).rejects.toMatchObject({
      message: "HTTP byte-range request failed.",
      cause,
      context: { url, offset: 8, length: 2 },
    });
  });

  it("preserves a fetch abort rejection", async () => {
    const controller = new AbortController();
    const source = createHttpByteSource(url, async (_input, init) => {
      controller.abort();
      throw init.signal?.reason;
    });

    await expect(source.read(0, 1, controller.signal)).rejects.toBe(controller.signal.reason);
  });

  it.each(["request", "response body"] as const)(
    "preserves a custom abort reason rejected by the %s",
    async (stage) => {
      const controller = new AbortController();
      const reason = new Error(`cancelled during ${stage}`);
      const source = createHttpByteSource(url, async () => {
        if (stage === "request") {
          controller.abort(reason);
          throw reason;
        }

        return {
          ...partialResponse("bytes 0-0/1", bytes(1)),
          async arrayBuffer() {
            controller.abort(reason);
            throw reason;
          },
        };
      });

      await expect(source.read(0, 1, controller.signal)).rejects.toBe(reason);
    },
  );

  it.each([
    [-1, 1],
    [1.5, 1],
    [Number.MAX_SAFE_INTEGER + 1, 1],
    [0, 0],
    [0, -1],
    [0, 1.5],
    [Number.MAX_SAFE_INTEGER, 2],
  ])("rejects invalid range (%s, %s) before fetch", async (offset, length) => {
    let fetches = 0;
    const source = createHttpByteSource(url, async () => {
      fetches += 1;
      return partialResponse("bytes 0-0/1", bytes(0));
    });

    await expect(source.read(offset, length)).rejects.toBeInstanceOf(GenomicReaderError);
    expect(fetches).toBe(0);
  });
});

describe("in-memory byte source", () => {
  it("reads exact ranges at the start, middle, and end and rejects bytes beyond the source", async () => {
    const source = createInMemoryByteSource(Uint8Array.of(10, 11, 12, 13, 14, 15));

    await expect(source.read(0, 2)).resolves.toEqual(Uint8Array.of(10, 11));
    await expect(source.read(2, 2)).resolves.toEqual(Uint8Array.of(12, 13));
    await expect(source.read(4, 2)).resolves.toEqual(Uint8Array.of(14, 15));
    await expect(source.read(5, 2)).rejects.toThrow(/exceeds.*6-byte source/i);
    await expect(source.read(6, 1)).rejects.toThrow(/exceeds.*6-byte source/i);
  });

  it("preserves the reason from an already-aborted read", async () => {
    const controller = new AbortController();
    controller.abort();
    const source = createInMemoryByteSource(Uint8Array.of(1));

    await expect(source.read(0, 1, controller.signal)).rejects.toBe(controller.signal.reason);
  });
});
