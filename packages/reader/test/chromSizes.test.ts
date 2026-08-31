import { afterEach, describe, expect, it, vi } from "vitest";
import { parseChromSizes, readChromSizes } from "../src/chromSizes";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseChromSizes", () => {
  it("keeps every named sequence and accepts common whitespace", () => {
    const sizes = parseChromSizes(
      "chr1\t248956422\r\nchrM 16569\nchr6_GL000256v2_alt\t492926\nchrUn_KI270442v1\t392061\n",
    );

    expect(sizes).toEqual({
      chr1: 248_956_422,
      chrM: 16_569,
      chr6_GL000256v2_alt: 492_926,
      chrUn_KI270442v1: 392_061,
    });
    expect(Object.isFrozen(sizes)).toBe(true);
  });

  it("ignores blank lines", () => {
    expect(parseChromSizes("\nchr1\t10\n  \nchr2\t20\n")).toEqual({ chr1: 10, chr2: 20 });
  });

  it.each([
    ["an empty file", "\n\n", "expected at least one entry"],
    ["a missing length", "chr1", "expected a name and length"],
    ["an extra field", "chr1\t10\textra", "expected a name and length"],
    ["a zero length", "chr1\t0", "length must be a positive integer"],
    ["a negative length", "chr1\t-1", "length must be a positive integer"],
    ["a decimal length", "chr1\t1.5", "length must be a positive integer"],
    ["an unsafe length", "chr1\t9007199254740992", "length must be a safe integer"],
    ["a duplicate name", "chr1\t10\nchr1\t20", 'duplicate sequence "chr1"'],
  ])("rejects %s", (_case, text, message) => {
    expect(() => parseChromSizes(text)).toThrow(message);
  });

  it("reports the source line for malformed entries", () => {
    expect(() => parseChromSizes("chr1\t10\n\nchr2\tinvalid")).toThrow(
      "Invalid chrom.sizes line 3",
    );
  });
});

describe("readChromSizes", () => {
  it("fetches and parses an HTTP chrom.sizes file", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("chr1\t10\nchrM\t5\n", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      readChromSizes({ url: "https://example.test/assembly.chrom.sizes", signal }),
    ).resolves.toEqual({ chr1: 10, chrM: 5 });
    expect(fetchMock).toHaveBeenCalledWith("https://example.test/assembly.chrom.sizes", { signal });
  });

  it("rejects invalid URLs and failed responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readChromSizes({ url: "file:///tmp/chrom.sizes" })).rejects.toThrow(
      "URL must use HTTP or HTTPS",
    );
    await expect(readChromSizes({ url: "https://example.test/missing" })).rejects.toThrow(
      "received HTTP 404",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("passes abort signals to fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      readChromSizes({
        url: "https://example.test/assembly.chrom.sizes",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
