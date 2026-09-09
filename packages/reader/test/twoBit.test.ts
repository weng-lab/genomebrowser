import { afterEach, describe, expect, it, vi } from "vitest";
import { createTwoBitFile } from "../src/lib";

const url = "https://example.test/reference.2bit";
const region = { chromosome: "chr1", start: 0, end: 12 };
afterEach(() => vi.unstubAllGlobals());

// Hand-encoded TCAGTCAGTCAG with unknown [3,6) and soft mask [5,9).
function fixture(little: boolean) {
  const bytes = new Uint8Array(60);
  const view = new DataView(bytes.buffer);
  const uint = (at: number, value: number) => view.setUint32(at, value, little);
  uint(0, 0x1a412743);
  uint(8, 1);
  bytes[16] = 4;
  bytes.set(new TextEncoder().encode("chr1"), 17);
  uint(21, 25);
  uint(25, 12);
  uint(29, 1);
  uint(33, 3);
  uint(37, 3);
  uint(41, 1);
  uint(45, 5);
  uint(49, 4);
  bytes.set([0x1b, 0x1b, 0x1b], 57);
  return bytes;
}
function mockFile(bytes: Uint8Array) {
  const mock = vi.fn<typeof fetch>(async (_input, init) => {
    init?.signal?.throwIfAborted();
    const match = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("range")!);
    const start = Number(match![1]);
    const end = Math.min(Number(match![2]), bytes.length - 1);
    return new Response(bytes.slice(start, end + 1), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${bytes.length}` },
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
describe("2bit regional reader", () => {
  it.each([true, false])(
    "decodes endian=%s, unknown blocks, soft masking and unaligned ranges",
    async (little) => {
      const mock = mockFile(fixture(little));
      const file = createTwoBitFile({ url });
      expect(await file.read(region)).toEqual([{ ...region, sequence: "TCANNnagtCAG" }]);
      mock.mockClear();
      expect(await file.read({ ...region, start: 2, end: 10 })).toEqual([
        { ...region, start: 2, end: 10, sequence: "ANNnagtC" },
      ]);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(new Headers(mock.mock.calls[0]![1]?.headers).get("range")).toBe("bytes=57-59");
    },
  );
  it("clips the end and returns no records for missing or nonoverlapping sequences", async () => {
    mockFile(fixture(true));
    const file = createTwoBitFile({ url });
    expect(await file.read({ ...region, start: 10, end: 100 })).toEqual([
      { ...region, start: 10, sequence: "AG" },
    ]);
    expect(await file.read({ ...region, start: 12, end: 20 })).toEqual([]);
    expect(await file.read({ ...region, chromosome: "missing" })).toEqual([]);
  });
  it.each(["signature", "version", "reserved", "block", "truncated"])(
    "rejects malformed %s",
    async (kind) => {
      let bytes = fixture(true);
      const view = new DataView(bytes.buffer);
      if (kind === "signature") bytes[0] = 0;
      if (kind === "version") view.setUint32(4, 1, true);
      if (kind === "reserved") view.setUint32(53, 1, true);
      if (kind === "block") view.setUint32(37, 100, true);
      if (kind === "truncated") bytes = bytes.slice(0, 59);
      mockFile(bytes);
      await expect(createTwoBitFile({ url }).read(region)).rejects.toThrow();
    },
  );
  it("does not share cancellation between concurrent reads and allows retry", async () => {
    const mock = mockFile(fixture(true));
    const file = createTwoBitFile({ url });
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(file.read(region, { signal: controller.signal })).rejects.toThrow("cancelled");
    expect(mock).not.toHaveBeenCalled();
    const active = file.read(region);
    await expect(file.read(region, { signal: controller.signal })).rejects.toThrow("cancelled");
    expect(await active).toHaveLength(1);
  });
  it("validates input before fetching", async () => {
    const mock = mockFile(fixture(true));
    expect(() => createTwoBitFile({ url: "file:///ref.2bit" })).toThrow();
    await expect(createTwoBitFile({ url }).read({ ...region, start: -1 })).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
