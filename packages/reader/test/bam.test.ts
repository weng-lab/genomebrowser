import { deflateSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBamFile } from "../src/lib";

const url = "https://example.test/reads.bam";
afterEach(() => vi.unstubAllGlobals());

/** Standard CRC-32, which fflate does not expose and the gzip trailer needs. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Wraps data in a single BGZF block: a gzip member carrying the BC subfield. */
function bgzfBlock(data: Uint8Array): Uint8Array {
  const deflated = deflateSync(data, { level: 6 });
  const size = 12 + 6 + deflated.length + 8;
  const block = new Uint8Array(size);
  const view = new DataView(block.buffer);
  block.set([31, 139, 8, 4], 0); // ID1, ID2, deflate, FEXTRA
  view.setUint16(10, 6, true); // XLEN
  block.set([66, 67], 12); // "BC"
  view.setUint16(14, 2, true); // subfield length
  view.setUint16(16, size - 1, true); // BSIZE
  block.set(deflated, 18);
  view.setUint32(18 + deflated.length, crc32(data), true);
  view.setUint32(22 + deflated.length, data.length, true);
  return block;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const CIGAR_CODES = "MIDNSHP=X";
const NUCLEOTIDE_CODES = "=ACMGRSVTWYHKDBN";

type TestRecord = {
  name: string;
  referenceId: number;
  position: number;
  mapq?: number;
  flag?: number;
  cigar?: [number, string][];
  sequence?: string;
};

/** Encodes one BAM alignment record, block_size prefix included. */
function encodeRecord(record: TestRecord): Uint8Array {
  const name = record.name;
  const cigar = record.cigar ?? [[10, "M"]];
  const sequence = record.sequence ?? "";
  const nameBytes = name.length + 1;
  const blockSize =
    32 + nameBytes + cigar.length * 4 + Math.ceil(sequence.length / 2) + sequence.length;
  const bytes = new Uint8Array(4 + blockSize);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, blockSize, true);
  view.setInt32(4, record.referenceId, true);
  view.setInt32(8, record.position, true);
  view.setUint8(12, nameBytes);
  view.setUint8(13, record.mapq ?? 60);
  view.setUint16(14, 0, true); // bin, unused by the reader
  view.setUint16(16, cigar.length, true);
  view.setUint16(18, record.flag ?? 0, true);
  view.setInt32(20, sequence.length, true);
  view.setInt32(24, -1, true); // next_refID
  view.setInt32(28, -1, true); // next_pos
  view.setInt32(32, 0, true); // tlen
  bytes.set(new TextEncoder().encode(name), 36);
  let at = 36 + nameBytes;
  for (const [length, operation] of cigar) {
    view.setUint32(at, (length << 4) | CIGAR_CODES.indexOf(operation), true);
    at += 4;
  }
  for (let index = 0; index < sequence.length; index += 2) {
    const high = NUCLEOTIDE_CODES.indexOf(sequence[index]!);
    const low = index + 1 < sequence.length ? NUCLEOTIDE_CODES.indexOf(sequence[index + 1]!) : 0;
    bytes[at + (index >> 1)] = (high << 4) | low;
  }
  return bytes;
}

function encodeHeader(references: [string, number][]): Uint8Array {
  const text = "@HD\tVN:1.6\n";
  const textBytes = new TextEncoder().encode(text);
  const parts: Uint8Array[] = [];
  const head = new Uint8Array(8 + textBytes.length + 4);
  const headView = new DataView(head.buffer);
  headView.setUint32(0, 0x014d4142, true); // "BAM\1"
  headView.setUint32(4, textBytes.length, true);
  head.set(textBytes, 8);
  headView.setUint32(8 + textBytes.length, references.length, true);
  parts.push(head);
  for (const [name, length] of references) {
    const nameBytes = new TextEncoder().encode(name);
    const entry = new Uint8Array(4 + nameBytes.length + 1 + 4);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, nameBytes.length + 1, true);
    entry.set(nameBytes, 4);
    entryView.setUint32(4 + nameBytes.length + 1, length, true);
    parts.push(entry);
  }
  return concat(parts);
}

/** A BAI with every record in bin 4681 and a single linear-index window. */
function encodeIndex(chunkBegin: bigint, chunkEnd: bigint): Uint8Array {
  const bytes = new Uint8Array(4 + 4 + 4 + (4 + 4 + 16) + 4 + 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x01494142, true); // "BAI\1"
  view.setUint32(4, 1, true); // one reference
  view.setUint32(8, 1, true); // one bin
  view.setUint32(12, 4681, true); // the finest-level bin covering 0-16kb
  view.setUint32(16, 1, true); // one chunk
  view.setBigUint64(20, chunkBegin, true);
  view.setBigUint64(28, chunkEnd, true);
  view.setUint32(36, 1, true); // one linear-index window
  view.setBigUint64(40, 0n, true);
  return bytes;
}

const records: TestRecord[] = [
  // Spans the query through a deletion, starting before it.
  {
    name: "spanning",
    referenceId: 0,
    position: 100,
    cigar: [
      [20, "M"],
      [60, "N"],
      [20, "M"],
    ],
  },
  { name: "inside", referenceId: 0, position: 150, cigar: [[10, "M"]], sequence: "ACGTACGTAC" },
  { name: "reverse", referenceId: 0, position: 160, flag: 0x10, mapq: 7, cigar: [[8, "M"]] },
  { name: "unmapped", referenceId: 0, position: 155, flag: 0x4 },
  { name: "elsewhere", referenceId: 0, position: 900, cigar: [[10, "M"]] },
];

function fixture() {
  const headerBlock = bgzfBlock(encodeHeader([["chr1", 1000]]));
  // Two record blocks, so a query has to walk a block boundary.
  const firstBlock = bgzfBlock(concat(records.slice(0, 3).map(encodeRecord)));
  const secondBlock = bgzfBlock(concat(records.slice(3).map(encodeRecord)));
  const bam = concat([headerBlock, firstBlock, secondBlock]);
  const firstOffset = BigInt(headerBlock.length) << 16n;
  const endOffset = BigInt(headerBlock.length + firstBlock.length + secondBlock.length) << 16n;
  return { bam, bai: encodeIndex(firstOffset, endOffset) };
}

function mockFiles(bam: Uint8Array, bai: Uint8Array) {
  const mock = vi.fn<typeof fetch>(async (input, init) => {
    init?.signal?.throwIfAborted();
    const bytes = String(input).endsWith(".bai") ? bai : bam;
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

describe("BAM reader", () => {
  it("reads the header and its reference names", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const header = await createBamFile({ url }).getHeader();
    expect(header.text).toBe("@HD\tVN:1.6\n");
    expect(header.references).toEqual([{ name: "chr1", length: 1000 }]);
  });

  it("returns records overlapping the region, including ones starting before it", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const file = createBamFile({ url });
    const found = await file.read({ chromosome: "chr1", start: 150, end: 175 });
    // "spanning" starts at 100 but reaches 200 through its N gap; "elsewhere"
    // and the unmapped record are excluded.
    expect(found.map((record) => record.name)).toEqual(["spanning", "inside", "reverse"]);
  });

  it("decodes coordinates, CIGAR, strand, quality and sequence", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const file = createBamFile({ url });
    const [spanning, inside, reverse] = await file.read({
      chromosome: "chr1",
      start: 150,
      end: 175,
    });
    expect(spanning).toMatchObject({
      chromosome: "chr1",
      start: 100,
      end: 200, // 20M + 60N + 20M advances the reference by 100
      cigar: [
        { operation: "M", length: 20 },
        { operation: "N", length: 60 },
        { operation: "M", length: 20 },
      ],
      strand: "+",
    });
    expect(inside).toMatchObject({ start: 150, end: 160, sequence: "ACGTACGTAC" });
    expect(reverse).toMatchObject({ strand: "-", mappingQuality: 7, flag: 0x10 });
  });

  it("returns nothing for an unknown reference or a region with no records", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const file = createBamFile({ url });
    expect(await file.read({ chromosome: "chrZ", start: 0, end: 100 })).toEqual([]);
    expect(await file.read({ chromosome: "chr1", start: 500, end: 600 })).toEqual([]);
  });

  it("reuses the header and index across reads", async () => {
    const { bam, bai } = fixture();
    const mock = mockFiles(bam, bai);
    const file = createBamFile({ url });
    await file.read({ chromosome: "chr1", start: 150, end: 175 });
    const afterFirst = mock.mock.calls.length;
    mock.mockClear();
    await file.read({ chromosome: "chr1", start: 150, end: 175 });
    // Only the alignment range is fetched again; the header and BAI are cached.
    expect(mock.mock.calls.length).toBeLessThan(afterFirst);
    expect(mock.mock.calls.every((call) => !String(call[0]).endsWith(".bai"))).toBe(true);
  });

  it("defaults the index URL to the BAM URL plus .bai", async () => {
    const { bam, bai } = fixture();
    const mock = mockFiles(bam, bai);
    await createBamFile({ url }).read({ chromosome: "chr1", start: 150, end: 175 });
    expect(mock.mock.calls.some((call) => String(call[0]) === `${url}.bai`)).toBe(true);
  });

  it("rejects a file that is not BAM", async () => {
    mockFiles(bgzfBlock(new TextEncoder().encode("not a bam file at all")), encodeIndex(0n, 1n));
    await expect(createBamFile({ url }).getHeader()).rejects.toThrow("Expected a BAM file");
  });

  it("rejects an index that is not BAI", async () => {
    const { bam } = fixture();
    mockFiles(bam, new TextEncoder().encode("nope"));
    await expect(
      createBamFile({ url }).read({ chromosome: "chr1", start: 150, end: 175 }),
    ).rejects.toThrow("Expected a BAI index file");
  });

  it("rejects data that is not BGZF", async () => {
    mockFiles(new TextEncoder().encode("plain bytes, no gzip member here"), encodeIndex(0n, 1n));
    await expect(createBamFile({ url }).getHeader()).rejects.toThrow(/gzip magic number/);
  });

  it("validates its inputs", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    expect(() => createBamFile({ url: "ftp://example.test/reads.bam" })).toThrow(/HTTP/);
    await expect(
      createBamFile({ url }).read({ chromosome: "chr1", start: 10, end: 5 }),
    ).rejects.toThrow(RangeError);
  });

  it("honours an abort signal", async () => {
    const { bam, bai } = fixture();
    mockFiles(bam, bai);
    const controller = new AbortController();
    controller.abort();
    await expect(
      createBamFile({ url }).read(
        { chromosome: "chr1", start: 150, end: 175 },
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });
});
