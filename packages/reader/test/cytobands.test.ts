import { gzipSync, strToU8 } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCytobands, readCytobands } from "../src/cytobands";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseCytobands", () => {
  it("parses the five UCSC fields, preserves stains and source order, and freezes its output", () => {
    const cytobands = parseCytobands(
      "chr2\t100\t200\tq21.1\tgpos75\r\n\nchr1\t0\t100\tp11.1\tacen\nchr1\t100\t150\tp11.2\tgneg\n",
    );

    expect(cytobands).toEqual([
      { chromosome: "chr2", start: 100, end: 200, name: "q21.1", stain: "gpos75" },
      { chromosome: "chr1", start: 0, end: 100, name: "p11.1", stain: "acen" },
      { chromosome: "chr1", start: 100, end: 150, name: "p11.2", stain: "gneg" },
    ]);
    expect(Object.isFrozen(cytobands)).toBe(true);
    expect(cytobands.every(Object.isFrozen)).toBe(true);
  });

  it("returns an immutable empty list for text with no records", () => {
    const cytobands = parseCytobands("\n \t\r\n");

    expect(cytobands).toEqual([]);
    expect(Object.isFrozen(cytobands)).toBe(true);
  });

  it("preserves an empty band name used by UCSC alternate-sequence rows", () => {
    expect(parseCytobands("chr10_GL383545v1_alt\t0\t179254\t\tgneg\n")).toEqual([
      {
        chromosome: "chr10_GL383545v1_alt",
        start: 0,
        end: 179254,
        name: "",
        stain: "gneg",
      },
    ]);
  });

  it.each([
    ["a missing field", "chr1\t0\t10\tp11", "expected exactly five tab-separated fields"],
    [
      "an extra field",
      "chr1\t0\t10\tp11\tgneg\textra",
      "expected exactly five tab-separated fields",
    ],
    ["a missing chromosome", "\t0\t10\tp11\tgneg", "must not be empty"],
    ["a missing stain", "chr1\t0\t10\tp11\t", "must not be empty"],
    ["a negative start", "chr1\t-1\t10\tp11\tgneg", "coordinates must be non-negative integers"],
    ["a decimal end", "chr1\t0\t1.5\tp11\tgneg", "coordinates must be non-negative integers"],
    [
      "a nonnumeric coordinate",
      "chr1\tstart\t10\tp11\tgneg",
      "coordinates must be non-negative integers",
    ],
    ["an unsafe start", "chr1\t9007199254740992\t9007199254740993\tp11\tgneg", "safe integers"],
    ["an unsafe end", "chr1\t0\t9007199254740992\tp11\tgneg", "safe integers"],
    ["an empty interval", "chr1\t10\t10\tp11\tgneg", "start must be less than end"],
    ["a reversed interval", "chr1\t11\t10\tp11\tgneg", "start must be less than end"],
  ])("rejects %s", (_case, text, message) => {
    expect(() => parseCytobands(text)).toThrow(message);
  });

  it("reports the original source line for malformed records", () => {
    expect(() => parseCytobands("chr1\t0\t10\tp11\tgneg\n\nchr1\t10\t10\tp12\tgneg")).toThrow(
      "Invalid cytoband line 3",
    );
  });

  it("rejects non-text input", () => {
    expect(() => parseCytobands(null as unknown as string)).toThrow(TypeError);
  });
});

describe("readCytobands", () => {
  it("fetches and parses plain UTF-8 cytobands with an abort signal", async () => {
    const signal = new AbortController().signal;
    const source = "chr1\t0\t100\tp11.é\tgneg\n";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(source, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      readCytobands({ url: "https://example.test/cytoBand.txt", signal }),
    ).resolves.toEqual([{ chromosome: "chr1", start: 0, end: 100, name: "p11.é", stain: "gneg" }]);
    expect(fetchMock).toHaveBeenCalledWith("https://example.test/cytoBand.txt", { signal });
  });

  it("detects and decompresses gzip from its magic bytes", async () => {
    const compressed = gzipSync(strToU8("chr1\t0\t100\tp11\tgpos25\n"));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(Uint8Array.from(compressed), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readCytobands({ url: "https://example.test/data" })).resolves.toEqual([
      { chromosome: "chr1", start: 0, end: 100, name: "p11", stain: "gpos25" },
    ]);
  });

  it("rejects malformed gzip data identified by the magic bytes", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(Uint8Array.of(0x1f, 0x8b, 0x00), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readCytobands({ url: "https://example.test/cytoBand.txt.gz" })).rejects.toThrow();
  });

  it("rejects invalid URLs and unsuccessful responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readCytobands({ url: "file:///tmp/cytoBand.txt" })).rejects.toThrow(
      "URL must use HTTP or HTTPS",
    );
    await expect(readCytobands({ url: "https://example.test/missing" })).rejects.toThrow(
      "received HTTP 503",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not fetch when its signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      readCytobands({ url: "https://example.test/cytoBand.txt", signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
