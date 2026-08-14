import { checkedByteLength } from "../bigint";
import { BinaryReader } from "../binaryReader";
import { readExactRange, type ExactRangeOptions } from "../httpRange";
import type { BbiHeader } from "./commonHeader";

// Zoom headers immediately follow the 64-byte common BBI header. Layout follows
// UCSC's public bbiFile.h.
const BBI_COMMON_HEADER_SIZE = 64n;
const BBI_ZOOM_HEADER_SIZE = 24n;

export type BbiZoomHeader = {
  reductionLevel: number;
  dataOffset: bigint;
  indexOffset: bigint;
};

export function parseBbiZoomHeaders(
  bytes: Uint8Array,
  header: Pick<BbiHeader, "byteOrder" | "zoomLevelCount">,
): BbiZoomHeader[] {
  const reader = new BinaryReader(bytes, header.byteOrder);
  const zoomHeaders: BbiZoomHeader[] = [];

  for (let index = 0; index < header.zoomLevelCount; index += 1) {
    const reductionLevel = reader.readUint32();
    reader.readUint32(); // Reserved.
    zoomHeaders.push({
      reductionLevel,
      dataOffset: reader.readUint64(),
      indexOffset: reader.readUint64(),
    });
  }

  return zoomHeaders;
}

export async function readBbiZoomHeaders(
  url: string,
  header: BbiHeader,
  options?: ExactRangeOptions,
): Promise<BbiZoomHeader[]> {
  if (header.zoomLevelCount === 0) return [];

  const byteLength = checkedByteLength(
    header.zoomLevelCount,
    BBI_ZOOM_HEADER_SIZE,
    "BBI zoom headers length",
  );
  const bytes = await readExactRange(url, BBI_COMMON_HEADER_SIZE, byteLength, options);
  return parseBbiZoomHeaders(bytes, header);
}
