import { afterEach, describe, expect, it, vi } from "vitest";
import { readExactRange } from "../src/internal/httpRange";

const url = "https://example.test/file.bb";

function partialResponse(
  body: number[],
  contentRange: string | null,
  options: { contentEncoding?: string; status?: number } = {},
): Response {
  const headers = new Headers();
  if (contentRange !== null) headers.set("Content-Range", contentRange);
  if (options.contentEncoding !== undefined) {
    headers.set("Content-Encoding", options.contentEncoding);
  }

  return new Response(Uint8Array.from(body), {
    status: options.status ?? 206,
    headers,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readExactRange", () => {
  it("requests and verifies an exact inclusive range without narrowing its bigint offset", async () => {
    const offset = 9_007_199_254_740_993n;
    const signal = new AbortController().signal;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(partialResponse([4, 5, 6], `bytes ${offset}-${offset + 2n}/*`));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readExactRange(url, offset, 3n, signal)).resolves.toEqual(
      Uint8Array.from([4, 5, 6]),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(url, {
      headers: { Range: `bytes=${offset}-${offset + 2n}` },
      signal,
    });
  });

  it.each([
    ["an ignored range", () => partialResponse([1, 2], "bytes 10-11/20", { status: 200 })],
    ["a missing Content-Range", () => partialResponse([1, 2], null)],
    ["an invalid Content-Range", () => partialResponse([1, 2], "bytes invalid")],
    ["different response bytes", () => partialResponse([1, 2], "bytes 11-12/20")],
    ["an inconsistent complete length", () => partialResponse([1, 2], "bytes 10-11/11")],
    [
      "transport Content-Encoding",
      () => partialResponse([1, 2], "bytes 10-11/20", { contentEncoding: "gzip" }),
    ],
    ["a short body", () => partialResponse([1], "bytes 10-11/20")],
    ["an oversized body", () => partialResponse([1, 2, 3], "bytes 10-11/20")],
  ])("rejects %s with an ordinary error", async (_case, responseFactory) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(responseFactory()));

    await expect(readExactRange(url, 10n, 2n)).rejects.toBeInstanceOf(Error);
  });

  it("preserves native fetch failures and rejects unsafe spans before fetching", async () => {
    const networkFailure = new TypeError("network unavailable");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(networkFailure);
    vi.stubGlobal("fetch", fetchMock);

    await expect(readExactRange(url, 0n, 1n)).rejects.toBe(networkFailure);
    await expect(readExactRange(url, 0n, 9_007_199_254_740_992n)).rejects.toBeInstanceOf(
      RangeError,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("preserves abort reasons and keeps concurrent request signals independent", async () => {
    const resolutions: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      return new Promise<Response>((resolve, reject) => {
        resolutions.push(resolve);
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const abortedController = new AbortController();
    const activeController = new AbortController();
    const abortReason = new DOMException("cancelled", "AbortError");
    const abortedRead = readExactRange(url, 0n, 2n, abortedController.signal);
    const activeRead = readExactRange(url, 2n, 2n, activeController.signal);
    const settled = Promise.allSettled([abortedRead, activeRead]);

    abortedController.abort(abortReason);
    resolutions[1]?.(partialResponse([3, 4], "bytes 2-3/4"));

    const [abortedResult, activeResult] = await settled;
    expect(abortedResult).toEqual({ status: "rejected", reason: abortReason });
    expect(activeResult).toEqual({ status: "fulfilled", value: Uint8Array.from([3, 4]) });
    expect(activeController.signal.aborted).toBe(false);
  });
});
