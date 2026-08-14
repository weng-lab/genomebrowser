import { BinaryReader, type ByteOrder } from "../binaryReader";
import { readExactRange, type ExactRangeOptions } from "../httpRange";
import type { RequestRangeReader } from "../requestRangeReader";

// Wire constants and layout follow UCSC's public sig.h and bbiFile.h.
const BIG_BED_MAGIC = 0x8789f2eb;
const BIG_WIG_MAGIC = 0x888ffc26;
const BBI_HEADER_SIZE = 64n;

export type BbiFormat = "bigBed" | "bigWig";

export type BbiHeader = {
  format: BbiFormat;
  byteOrder: ByteOrder;
  version: number;
  zoomLevelCount: number;
  chromosomeTreeOffset: bigint;
  unzoomedDataOffset: bigint;
  unzoomedIndexOffset: bigint;
  fieldCount: number;
  definedFieldCount: number;
  autoSqlOffset: bigint;
  totalSummaryOffset: bigint;
  uncompressBufferSize: number;
  extensionOffset: bigint;
};

function detectBbiContainer(bytes: Uint8Array): { format: BbiFormat; byteOrder: ByteOrder } {
  if (bytes.byteLength < 4) {
    throw new RangeError("BBI header is truncated");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const byteOrder of ["little-endian", "big-endian"] as const) {
    const magic = view.getUint32(0, byteOrder === "little-endian");
    if (magic === BIG_BED_MAGIC) return { format: "bigBed", byteOrder };
    if (magic === BIG_WIG_MAGIC) return { format: "bigWig", byteOrder };
  }
  throw new Error("Unsupported BBI container magic");
}

export function parseBbiHeader(bytes: Uint8Array): BbiHeader {
  const { format, byteOrder } = detectBbiContainer(bytes);
  const reader = new BinaryReader(bytes, byteOrder);

  reader.readUint32();
  return {
    format,
    byteOrder,
    version: reader.readUint16(),
    zoomLevelCount: reader.readUint16(),
    chromosomeTreeOffset: reader.readUint64(),
    unzoomedDataOffset: reader.readUint64(),
    unzoomedIndexOffset: reader.readUint64(),
    fieldCount: reader.readUint16(),
    definedFieldCount: reader.readUint16(),
    autoSqlOffset: reader.readUint64(),
    totalSummaryOffset: reader.readUint64(),
    uncompressBufferSize: reader.readUint32(),
    extensionOffset: reader.readUint64(),
  };
}

export async function readBbiHeader(
  url: string,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
): Promise<BbiHeader> {
  const bytes =
    requestReader === undefined
      ? await readExactRange(url, 0n, BBI_HEADER_SIZE, options)
      : await requestReader.readExact(0n, BBI_HEADER_SIZE);
  return parseBbiHeader(bytes);
}
