import { BinaryReader, type ByteOrder } from "./binaryReader";
import { unsignedBigIntToNumber } from "./bigint";
import { readExactRange } from "./httpRange";

// Wire constants and layouts follow UCSC's public sig.h, bbiFile.h, and bPlusTree.h.
// Separator routing follows the tree produced and read by UCSC's bPlusTree.c: each
// internal key is the least key in its child, so lookup selects the last key <= target.
const BIG_BED_MAGIC = 0x8789f2eb;
const B_PLUS_TREE_MAGIC = 0x78ca8c91;
const BBI_HEADER_SIZE = 64n;
const B_PLUS_TREE_HEADER_SIZE = 32n;
const B_PLUS_TREE_NODE_HEADER_SIZE = 4n;
const CHROMOSOME_VALUE_SIZE = 8;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

export type BbiHeader = {
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

export type Chromosome = {
  id: number;
  size: number;
};

type BPlusTreeHeader = {
  blockSize: number;
  keySize: number;
  itemCount: bigint;
  rootOffset: bigint;
};

function detectBigBedByteOrder(bytes: Uint8Array): ByteOrder {
  if (bytes.byteLength < 4) {
    throw new RangeError("BigBed header is truncated");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) === BIG_BED_MAGIC) return "little-endian";
  if (view.getUint32(0, false) === BIG_BED_MAGIC) return "big-endian";
  throw new Error("Invalid BigBed magic");
}

export function parseBigBedHeader(bytes: Uint8Array): BbiHeader {
  const byteOrder = detectBigBedByteOrder(bytes);
  const reader = new BinaryReader(bytes, byteOrder);

  reader.readUint32();
  return {
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

export async function readBigBedHeader(url: string, signal?: AbortSignal): Promise<BbiHeader> {
  return parseBigBedHeader(await readExactRange(url, 0n, BBI_HEADER_SIZE, signal));
}

function addOffset(offset: bigint, byteLength: bigint): bigint {
  const result = offset + byteLength;
  if (result > MAX_UINT64) {
    throw new RangeError("BBI file offset exceeds the unsigned 64-bit limit");
  }
  return result;
}

function parseTreeHeader(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  treeOffset: bigint,
): BPlusTreeHeader {
  const reader = new BinaryReader(bytes, byteOrder);
  if (reader.readUint32() !== B_PLUS_TREE_MAGIC) {
    throw new Error("Invalid chromosome B+ tree magic or byte order");
  }

  const blockSize = reader.readUint32();
  const keySize = reader.readUint32();
  const valueSize = reader.readUint32();
  const itemCount = reader.readUint64();
  reader.skip(8);

  if (blockSize === 0 || keySize === 0) {
    throw new Error("Invalid chromosome B+ tree dimensions");
  }
  if (valueSize !== CHROMOSOME_VALUE_SIZE) {
    throw new Error("Invalid chromosome B+ tree value size");
  }

  return {
    blockSize,
    keySize,
    itemCount,
    rootOffset: addOffset(treeOffset, B_PLUS_TREE_HEADER_SIZE),
  };
}

function comparePaddedKey(target: Uint8Array, key: Uint8Array): number {
  for (let index = 0; index < key.byteLength; index += 1) {
    const difference = (target[index] ?? 0) - key[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function checkedNodeBodyLength(count: number, itemSize: bigint): bigint {
  const byteLength = BigInt(count) * itemSize;
  unsignedBigIntToNumber(byteLength, "B+ tree node body length");
  return byteLength;
}

export async function lookupChromosome(
  url: string,
  header: BbiHeader,
  chromosome: string,
  signal?: AbortSignal,
): Promise<Chromosome | undefined> {
  const treeBytes = await readExactRange(
    url,
    header.chromosomeTreeOffset,
    B_PLUS_TREE_HEADER_SIZE,
    signal,
  );
  const tree = parseTreeHeader(treeBytes, header.byteOrder, header.chromosomeTreeOffset);
  const target = new TextEncoder().encode(chromosome);
  if (target.byteLength > tree.keySize || tree.itemCount === 0n) return undefined;

  let nodeOffset = tree.rootOffset;
  for (;;) {
    const nodeHeaderBytes = await readExactRange(
      url,
      nodeOffset,
      B_PLUS_TREE_NODE_HEADER_SIZE,
      signal,
    );
    const nodeHeader = new BinaryReader(nodeHeaderBytes, header.byteOrder);
    const nodeType = nodeHeader.readUint8();
    nodeHeader.readUint8();
    const count = nodeHeader.readUint16();

    if (nodeType !== 0 && nodeType !== 1) {
      throw new Error("Invalid chromosome B+ tree node type");
    }
    if (count > tree.blockSize) {
      throw new Error("Chromosome B+ tree node exceeds its block size");
    }
    if (count === 0) {
      if (nodeType === 1) return undefined;
      throw new Error("Chromosome B+ tree internal node has no children");
    }

    const payloadSize = nodeType === 1 ? BigInt(CHROMOSOME_VALUE_SIZE) : 8n;
    const itemSize = BigInt(tree.keySize) + payloadSize;
    const bodyLength = checkedNodeBodyLength(count, itemSize);
    const bodyBytes = await readExactRange(
      url,
      addOffset(nodeOffset, B_PLUS_TREE_NODE_HEADER_SIZE),
      bodyLength,
      signal,
    );
    const body = new BinaryReader(bodyBytes, header.byteOrder);
    let selectedChild: bigint | undefined;

    for (let index = 0; index < count; index += 1) {
      const keyStart = body.position;
      body.skip(tree.keySize);
      const key = bodyBytes.subarray(keyStart, body.position);
      const comparison = comparePaddedKey(target, key);

      if (nodeType === 1) {
        const id = body.readUint32();
        const size = body.readUint32();
        if (comparison === 0) return { id, size };
      } else {
        const childOffset = body.readUint64();
        if (index === 0 || comparison >= 0) selectedChild = childOffset;
      }
    }

    if (nodeType === 1) return undefined;
    if (selectedChild === undefined) {
      throw new Error("Chromosome B+ tree node has no routable child");
    }
    nodeOffset = selectedChild;
  }
}
