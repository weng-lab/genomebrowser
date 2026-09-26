import { readFileSync } from "node:fs";
import { gzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBamFile } from "../src/lib";

const url = "https://genome.ucsc.edu/goldenPath/help/examples/bamExample.bam";
const indexUrl = url + ".bai";
const region = { chromosome: "chr1", start: 100, end: 200 };
afterEach(() => vi.unstubAllGlobals());

function mockFiles(
  bam: Uint8Array,
  bai: Uint8Array,
  hold?: (signal: AbortSignal) => Promise<Response | void>,
) {
  const mock = vi.fn<typeof fetch>(async (input, init) => {
    init?.signal?.throwIfAborted();
    if (String(input) === indexUrl) return new Response(bai.slice(), { status: 200 });
    const held = await hold?.(init!.signal!);
    if (held) return held;
    const range = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("range")!);
    const start = Number(range![1]);
    const end = Math.min(Number(range![2]), bam.length - 1);
    return new Response(bam.slice(start, end + 1), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${bam.length}` },
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
function concat(...arrays: Uint8Array[]) {
  const result = new Uint8Array(arrays.reduce((sum, bytes) => sum + bytes.length, 0));
  let offset = 0;
  for (const bytes of arrays) {
    result.set(bytes, offset);
    offset += bytes.length;
  }
  return result;
}
function int(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setInt32(0, value, true);
  return bytes;
}
function vo(value: bigint) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}
function bgzf(bytes: Uint8Array) {
  const gzip = gzipSync(bytes);
  const result = concat(
    gzip.subarray(0, 10),
    new Uint8Array([6, 0, 66, 67, 2, 0, 0, 0]),
    gzip.subarray(10),
  );
  result[3] = 4;
  new DataView(result.buffer).setUint16(16, result.length - 1, true);
  return result;
}
function tag(name: string, type: string, ...values: Uint8Array[]) {
  return concat(new TextEncoder().encode(name + type), ...values);
}
function cgTag(ops: [number, number][]) {
  return tag(
    "CG",
    "B",
    new TextEncoder().encode("I"),
    int(ops.length),
    ...ops.map(([length, op]) => int((length << 4) | op)),
  );
}
// Splicing/deletion, clipping, insertion, padding, =/X, and a cross-reference mate.
function fixture(
  options: {
    text?: string;
    split?: boolean;
    splitHeader?: boolean;
    sameBlock?: boolean;
    odd?: boolean;
    invalidRecord?: boolean;
    longCigar?: boolean;
    aux?: Uint8Array;
    missingQualities?: boolean;
    flags?: number;
    duplicateChunks?: boolean;
    secondReference?: string;
  } = {},
) {
  const header = concat(
    int(0x014d4142),
    int(new TextEncoder().encode(options.text ?? "").length),
    new TextEncoder().encode(options.text ?? ""),
    int(2),
    int(5),
    new TextEncoder().encode("chr1\0"),
    int(10000),
    int(options.secondReference?.length ?? 5),
    new TextEncoder().encode(options.secondReference ?? "chr2\0"),
    int(10000),
  );
  const ops = options.longCigar
    ? [
        [6, 4],
        [26, 3],
      ]
    : [
        [1, 5],
        [options.odd ? 2 : 1, 4],
        [2, 0],
        [1, 1],
        [20, 3],
        [2, 2],
        [1, 7],
        [1, 8],
        [1, 6],
        [1, 5],
      ];
  const core = new Uint8Array(32);
  const view = new DataView(core.buffer);
  view.setInt32(4, 100, true);
  core[8] = 5;
  core[9] = 42;
  view.setUint16(12, ops.length, true);
  view.setUint16(14, options.flags ?? 49, true);
  view.setInt32(16, options.odd ? 7 : 6, true);
  view.setInt32(20, 1, true);
  view.setInt32(24, 500, true);
  view.setInt32(28, -100, true);
  // Six bases for 1S2M1I1=1X.
  const record = concat(
    core,
    new TextEncoder().encode("read\0"),
    ...ops.map(([length, op]) => int((length << 4) | op)),
    new Uint8Array(options.odd ? [0x12, 0x48, 0xf1, 0x20] : [0x12, 0x48, 0xf1]),
    new Uint8Array(options.odd ? 7 : 6).fill(options.missingQualities ? 255 : 30),
    options.aux ?? new Uint8Array(),
  );
  const alignment = concat(int(options.invalidRecord ? record.length + 1 : record.length), record);
  const first = options.splitHeader
    ? concat(bgzf(header.subarray(0, 19)), bgzf(header.subarray(19)))
    : bgzf(header);
  const split = options.split ? 17 : alignment.length;
  const blocks = [bgzf(alignment.subarray(0, split))];
  if (options.split) blocks.push(bgzf(alignment.subarray(split)));
  const bam = options.sameBlock
    ? concat(bgzf(concat(header, alignment, alignment)), bgzf(new Uint8Array()))
    : concat(first, ...blocks, bgzf(new Uint8Array()));
  const start = options.sameBlock ? BigInt(header.length) : BigInt(first.length) << 16n;
  const end = options.sameBlock
    ? BigInt(header.length + alignment.length)
    : BigInt(first.length + blocks.reduce((sum, bytes) => sum + bytes.length, 0)) << 16n;
  const chunks = options.duplicateChunks ? 2 : 1;
  const bai = concat(
    int(0x01494142),
    int(2),
    int(1),
    int(0),
    int(chunks),
    ...Array.from({ length: chunks }, () => concat(vo(start), vo(end))),
    int(1),
    vo(start),
    int(0),
    int(0),
  );
  return { bam, bai };
}

describe("BAM regional reader", () => {
  it("matches an optional chr prefix without changing cached reference names", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    const [plain, prefixed] = await Promise.all([
      file.read({ ...region, chromosome: "1" }),
      file.read(region),
    ]);
    expect(plain).toHaveLength(1);
    expect(plain[0].chromosome).toBe("1");
    expect(prefixed[0].chromosome).toBe("chr1");
    expect(plain[0].mate?.chromosome).toBe("chr2");
    expect(await file.read({ ...region, chromosome: "CHR1" })).toEqual([]);
  });
  it("prefers an exact reference even when only the alternate has alignments", async () => {
    const { bam, bai } = fixture({ secondReference: "1\0" });
    mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    expect(await file.read({ ...region, chromosome: "1" })).toEqual([]);
    expect(await file.read(region)).toHaveLength(1);
  });

  it("replaces long CIGAR placeholders with the CG tag after skipping other tags", async () => {
    const { bam, bai } = fixture({
      longCigar: true,
      aux: concat(
        tag("NM", "i", int(3)),
        tag("RG", "Z", new TextEncoder().encode("group\0")),
        tag("ZB", "B", new TextEncoder().encode("s"), int(2), new Uint8Array(4)),
        // 2M20N1D3M1I: six bases over the placeholder's 26-base span.
        cgTag([
          [2, 0],
          [20, 3],
          [1, 2],
          [3, 0],
          [1, 1],
        ]),
      ),
    });
    mockFiles(bam, bai);
    const [record] = await createBamFile({ url, indexUrl }).read(region);
    expect(record).toMatchObject({ start: 100, end: 126, sequence: "ACGTNA" });
    expect(record.cigar.map(({ op, length }) => `${length}${op}`).join("")).toBe("2M20N1D3M1I");
    expect(record.cigar[3]).toEqual({ op: "M", length: 3, sequenceOffset: 2, referenceOffset: 23 });
  });
  it.each([
    ["missing", new Uint8Array()],
    ["truncated", cgTag([[2, 0]]).subarray(0, 10)],
    ["inconsistent", cgTag([[6, 0]])],
    ["non-uint32", tag("CG", "B", new TextEncoder().encode("i"), int(1), int((6 << 4) | 0))],
  ])("keeps a long CIGAR read's span when its CG tag is %s", async (_, aux) => {
    const { bam, bai } = fixture({ longCigar: true, aux });
    mockFiles(bam, bai);
    const records = await createBamFile({ url, indexUrl }).read(region);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ start: 100, end: 126, sequence: "ACGTNA", cigar: [] });
  });
  it("reads header fields across blocks and decodes odd sequence lengths", async () => {
    const { bam, bai } = fixture({ splitHeader: true, odd: true });
    mockFiles(bam, bai);
    const records = await createBamFile({ url, indexUrl }).read(region);
    expect(records[0].sequence).toBe("ACGTNAC");
    expect(records[0].phredQualities).toEqual([30, 30, 30, 30, 30, 30, 30]);
  });
  it("honors both virtual offsets inside one block without reading the next record", async () => {
    const { bam, bai } = fixture({ sameBlock: true });
    mockFiles(bam, bai);
    expect(await createBamFile({ url, indexUrl }).read(region)).toHaveLength(1);
  });
  it("rejects an incomplete alignment instead of returning partial data", async () => {
    const { bam, bai } = fixture({ invalidRecord: true });
    mockFiles(bam, bai);
    await expect(createBamFile({ url, indexUrl }).read(region)).rejects.toThrow(
      "truncated BAM record",
    );
  });
  it("propagates HTTP errors and requires BAM range responses", async () => {
    const { bam, bai } = fixture();
    const mock = mockFiles(bam, bai);
    mock.mockResolvedValueOnce(new Response(bam, { status: 200 }));
    await expect(createBamFile({ url, indexUrl }).read(region)).rejects.toThrow("206");
    mockFiles(bam, bai).mockImplementation(async (input) => {
      if (String(input) === indexUrl) return new Response(null, { status: 404 });
      return new Response(bam, {
        status: 206,
        headers: { "Content-Range": `bytes 0-${bam.length - 1}/${bam.length}` },
      });
    });
    await expect(createBamFile({ url, indexUrl }).read(region)).rejects.toThrow("404");
  });
  it.each([false, true])("decodes CIGAR and mate data across blocks (split=%s)", async (split) => {
    const { bam, bai } = fixture({ split, duplicateChunks: true });
    mockFiles(bam, bai);
    const records = await createBamFile({ url, indexUrl }).read({
      ...region,
      start: 120,
      end: 121,
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      chromosome: "chr1",
      start: 100,
      end: 126,
      readName: "read",
      flags: 49,
      strand: "-",
      sequence: "ACGTNA",
      phredQualities: [30, 30, 30, 30, 30, 30],
      mappingQuality: 42,
      templateLength: -100,
      mate: { chromosome: "chr2", start: 500, strand: "-", unmapped: false },
    });
    expect(records[0].cigar[4]).toEqual({
      op: "N",
      length: 20,
      sequenceOffset: 4,
      referenceOffset: 2,
    });
    expect(records[0].cigar[6]).toEqual({
      op: "=",
      length: 1,
      sequenceOffset: 4,
      referenceOffset: 24,
    });
  });
  it("uses half-open overlap, exact names, and omits unmapped records", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    expect(await file.read({ ...region, start: 0, end: 100 })).toEqual([]);
    expect(await file.read({ ...region, start: 126, end: 200 })).toEqual([]);
    expect(await file.read({ ...region, chromosome: "missing" })).toEqual([]);
    expect(await file.read({ ...region, start: 10000, end: 10001 })).toEqual([]);
    const unmapped = fixture({ flags: 4 });
    mockFiles(unmapped.bam, unmapped.bai);
    expect(await createBamFile({ url, indexUrl }).read(region)).toEqual([]);
  });
  it("represents unavailable base qualities as null and reuses the index", async () => {
    const { bam, bai } = fixture({ missingQualities: true });
    const mock = mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    expect((await file.read(region))[0].phredQualities).toBeNull();
    await file.read(region);
    expect(mock.mock.calls.filter(([input]) => input === indexUrl)).toHaveLength(1);
  });
  it("isolates in-flight cancellation and permits retry", async () => {
    const { bam, bai } = fixture();
    const mock = mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    const controller = new AbortController();
    const aborted = file.read(region, { signal: controller.signal });
    const active = file.read(region);
    controller.abort();
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    expect(await active).toHaveLength(1);
    expect(await file.read(region)).toHaveLength(1);
    mock.mockClear();
    await expect(file.read(region, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mock).not.toHaveBeenCalled();
  });
  it.each(["bgzf", "bai", "truncated", "mismatch"])(
    "rejects malformed %s and permits retry",
    async (kind) => {
      const good = fixture();
      const bam = good.bam.slice();
      let bai = good.bai.slice();
      if (kind === "bgzf") bam[0] = 0;
      if (kind === "bai") bai[0] = 0;
      if (kind === "truncated") bai = bai.slice(0, -1);
      if (kind === "mismatch") bai = concat(int(0x01494142), int(0));
      mockFiles(bam, bai);
      const file = createBamFile({ url, indexUrl });
      await expect(file.read(region)).rejects.toThrow();
      mockFiles(good.bam, good.bai);
      expect(await file.read(region)).toHaveLength(1);
    },
  );
  it("validates URLs and coordinates before fetching", async () => {
    const { bam, bai } = fixture();
    const mock = mockFiles(bam, bai);
    expect(() => createBamFile({ url, indexUrl: "file:///index.bai" })).toThrow();
    const file = createBamFile({ url, indexUrl });
    for (const [start, end] of [
      [-1, 10],
      [10, 10],
      [0, 2 ** 29 + 1],
      [0.5, 10],
    ])
      await expect(file.read({ ...region, start, end })).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
  it("reads the offline UCSC example across multiple BGZF blocks", async () => {
    const bam = new Uint8Array(
      readFileSync(new URL("./fixtures/bam/bamExample.bam", import.meta.url)),
    );
    const bai = new Uint8Array(
      readFileSync(new URL("./fixtures/bam/bamExample.bam.bai", import.meta.url)),
    );
    mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    const records = await file.read({ chromosome: "21", start: 33019935, end: 33021000 });
    // Independently counted by sequentially scanning the decompressed UCSC BAM.
    expect(records).toHaveLength(916);
    expect(records[0]).toMatchObject({
      chromosome: "21",
      start: 33019935,
      end: 33020011,
      readName: "SRR010939.15011799",
      flags: 35,
      mappingQuality: 99,
      mate: { chromosome: "21", start: 33019946, strand: "-", unmapped: false },
    });
    expect(records[0].sequence).toHaveLength(76);
    expect(records.every((record) => record.start < 33021000 && record.end > 33019935)).toBe(true);
    const prefixed = await file.read({ chromosome: "chr21", start: 33019935, end: 33021000 });
    expect(prefixed).toHaveLength(916);
    expect(prefixed[0]).toMatchObject({
      chromosome: "chr21",
      start: records[0].start,
      end: records[0].end,
      mate: { chromosome: "chr21" },
    });
    expect(records[0].chromosome).toBe("21");
    expect(await file.read({ chromosome: "1", start: 0, end: 100 })).toEqual([]);
  });
});

// Deterministic incompressible bytes, so BGZF blocks keep a predictable compressed size.
function noise(length: number) {
  const bytes = new Uint8Array(length);
  let state = 1;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    bytes[i] = state >>> 24;
  }
  return bytes;
}
// One alignment per block, each its own BAI chunk. Filler blocks push chunks apart; padding after
// an alignment lies outside its chunk but enlarges the block the chunk ends in.
function spacedFixture(count: number, options: { fillerBlocks?: number; padding?: number } = {}) {
  const header = concat(
    int(0x014d4142),
    int(0),
    int(1),
    int(5),
    new TextEncoder().encode("chr1\0"),
    int(10000),
  );
  const blocks = [bgzf(header)];
  let offset = BigInt(blocks[0].length);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const core = new Uint8Array(32);
    const view = new DataView(core.buffer);
    view.setInt32(4, 100 + i, true);
    core[8] = 2;
    view.setUint16(12, 1, true);
    view.setInt32(20, -1, true);
    view.setInt32(24, -1, true);
    const record = concat(core, new TextEncoder().encode("r\0"), int((10 << 4) | 0));
    const alignment = concat(int(record.length), record);
    const block = bgzf(concat(alignment, noise(options.padding ?? 0)));
    chunks.push(concat(vo(offset << 16n), vo((offset << 16n) | BigInt(alignment.length))));
    blocks.push(block);
    offset += BigInt(block.length);
    for (let j = 0; j < (options.fillerBlocks ?? 0); j++) {
      const filler = bgzf(noise(60000));
      blocks.push(filler);
      offset += BigInt(filler.length);
    }
  }
  const bam = concat(...blocks, bgzf(new Uint8Array()));
  const bai = concat(int(0x01494142), int(1), int(1), int(0), int(count), ...chunks, int(0));
  return { bam, bai };
}
// Holds BAM range requests until the test settles them.
function holdRanges() {
  const pending: { signal: AbortSignal; settle: (response?: Response) => void }[] = [];
  const hold = (signal: AbortSignal) =>
    new Promise<Response | void>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      pending.push({ signal, settle: resolve });
    });
  return { pending, hold };
}
const spacedRegion = { chromosome: "chr1", start: 0, end: 10000 };

describe("BAM chunk requests", () => {
  it("reads nearby chunks in one request", async () => {
    const { bam, bai } = spacedFixture(20);
    const mock = mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    await file.getHeader();
    mock.mockClear();
    const records = await file.read(spacedRegion);
    expect(records.map((record) => record.start)).toEqual(
      Array.from({ length: 20 }, (_, i) => 100 + i),
    );
    expect(mock.mock.calls.filter(([input]) => input === url)).toHaveLength(1);
  });
  it("reads distant chunks concurrently, at most eight at a time", async () => {
    // About 60 KB apart: merging these would download more than separate requests.
    const { bam, bai } = spacedFixture(20, { fillerBlocks: 1 });
    let active = 0;
    let peak = 0;
    const mock = mockFiles(bam, bai, async () => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
    });
    const file = createBamFile({ url, indexUrl });
    await file.getHeader();
    mock.mockClear();
    peak = 0;
    const records = await file.read(spacedRegion);
    expect(records.map((record) => record.start)).toEqual(
      Array.from({ length: 20 }, (_, i) => 100 + i),
    );
    expect(mock.mock.calls.filter(([input]) => input === url)).toHaveLength(20);
    expect(peak).toBe(8);
  });
  it("reads a final block larger than the usual allowance", async () => {
    const { bam, bai } = spacedFixture(1, { padding: 50000 });
    mockFiles(bam, bai);
    const records = await createBamFile({ url, indexUrl }).read(spacedRegion);
    expect(records.map((record) => record.start)).toEqual([100]);
  });
  it("cancels every in-flight request when the read is aborted", async () => {
    const { bam, bai } = spacedFixture(20, { fillerBlocks: 2 });
    const { pending, hold } = holdRanges();
    let holding = false;
    mockFiles(bam, bai, (signal) => (holding ? hold(signal) : Promise.resolve()));
    const file = createBamFile({ url, indexUrl });
    await file.getHeader();
    holding = true;
    const controller = new AbortController();
    const read = file.read(spacedRegion, { signal: controller.signal });
    await vi.waitFor(() => expect(pending).toHaveLength(8));
    controller.abort();
    await expect(read).rejects.toMatchObject({ name: "AbortError" });
    expect(pending.every(({ signal }) => signal.aborted)).toBe(true);
    expect(pending).toHaveLength(8);
  });
  it("cancels the remaining requests when one fails", async () => {
    const { bam, bai } = spacedFixture(20, { fillerBlocks: 2 });
    const { pending, hold } = holdRanges();
    let holding = false;
    mockFiles(bam, bai, (signal) => (holding ? hold(signal) : Promise.resolve()));
    const file = createBamFile({ url, indexUrl });
    await file.getHeader();
    holding = true;
    const read = file.read(spacedRegion);
    await vi.waitFor(() => expect(pending).toHaveLength(8));
    pending[3].settle(new Response(null, { status: 500 }));
    await expect(read).rejects.toThrow("received 500");
    expect(pending.every(({ signal }, i) => i === 3 || signal.aborted)).toBe(true);
    expect(pending).toHaveLength(8);
  });
});

describe("BAM header access", () => {
  it("returns SAM text and references across blocks without fetching an index and protects the cache", async () => {
    const { bam, bai } = fixture({ text: "@HD\tVN:1.6\n", splitHeader: true });
    const fetch = mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    const header = await file.getHeader();
    expect(header).toEqual({
      text: "@HD\tVN:1.6\n",
      references: [
        { name: "chr1", length: 10000 },
        { name: "chr2", length: 10000 },
      ],
    });
    expect(fetch.mock.calls.some(([url]) => url === indexUrl)).toBe(false);
    header.references[0].name = "changed";
    fetch.mockClear();
    expect((await file.getHeader()).references[0].name).toBe("chr1");
    expect(fetch).not.toHaveBeenCalled();
    expect(await file.read(region)).toHaveLength(1);
    fetch.mockClear();
    expect((await file.getHeader()).text).toBe("@HD\tVN:1.6\n");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("honors pre-aborted, in-flight, and cached cancellation without poisoning other callers", async () => {
    const { bam, bai } = fixture();
    const fetch = mockFiles(bam, bai);
    const file = createBamFile({ url, indexUrl });
    const aborted = new AbortController();
    aborted.abort();
    await expect(file.getHeader({ signal: aborted.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetch).not.toHaveBeenCalled();
    const controller = new AbortController();
    const pending = file.getHeader({ signal: controller.signal });
    const active = file.getHeader();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect((await active).references).toHaveLength(2);
    fetch.mockClear();
    await expect(file.getHeader({ signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    const cachedController = new AbortController();
    const cached = file.getHeader({ signal: cachedController.signal });
    cachedController.abort();
    await expect(cached).rejects.toMatchObject({ name: "AbortError" });
    expect((await file.getHeader()).references).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects malformed header data and permits retry", async () => {
    const good = fixture();
    mockFiles(bgzf(concat(int(0x014d4142), int(-1))), good.bai);
    const file = createBamFile({ url, indexUrl });
    await expect(file.getHeader()).rejects.toThrow();
    mockFiles(good.bam, good.bai);
    expect((await file.getHeader()).references).toHaveLength(2);
  });
});
