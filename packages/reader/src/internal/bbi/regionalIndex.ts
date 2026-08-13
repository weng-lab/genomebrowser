import { addUint64Offset, checkedByteLength } from "../bigint";
import { BinaryReader, type ByteOrder } from "../binaryReader";
import { readExactRange } from "../httpRange";
import type { BbiHeader } from "./commonHeader";

// Wire constants and layout follow UCSC's public sig.h and cirTree.h/cirTree.c.
const CIRTREE_MAGIC = 0x2468ace0;
const CIRTREE_HEADER_SIZE = 48n;
const CIRTREE_NODE_HEADER_SIZE = 4n;
const CIRTREE_INTERNAL_ITEM_SIZE = 24n;
const CIRTREE_LEAF_ITEM_SIZE = 32n;

export type BbiQuery = {
  chromosomeId: number;
  start: number;
  end: number;
};

export type BlockReference = {
  offset: bigint;
  size: bigint;
};

type CirTreeHeader = {
  blockSize: number;
  itemCount: bigint;
  rootOffset: bigint;
};

type GenomicPosition = {
  chromosomeId: number;
  base: number;
};

type IndexedRange = {
  start: GenomicPosition;
  end: GenomicPosition;
};

function comparePosition(left: GenomicPosition, right: GenomicPosition): number {
  if (left.chromosomeId !== right.chromosomeId) {
    return left.chromosomeId < right.chromosomeId ? -1 : 1;
  }
  if (left.base === right.base) return 0;
  return left.base < right.base ? -1 : 1;
}

function overlaps(query: BbiQuery, range: IndexedRange): boolean {
  const queryStart = { chromosomeId: query.chromosomeId, base: query.start };
  const queryEnd = { chromosomeId: query.chromosomeId, base: query.end };

  // cirTree ranges use one-past-the-last-base ends. UCSC's cirTreeOverlaps
  // therefore tests both sides strictly, matching half-open interval overlap.
  return comparePosition(queryStart, range.end) < 0 && comparePosition(queryEnd, range.start) > 0;
}

function parseIndexedRange(reader: BinaryReader): IndexedRange {
  return {
    start: { chromosomeId: reader.readUint32(), base: reader.readUint32() },
    end: { chromosomeId: reader.readUint32(), base: reader.readUint32() },
  };
}

function parseCirTreeHeader(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  indexOffset: bigint,
): CirTreeHeader {
  const reader = new BinaryReader(bytes, byteOrder);
  if (reader.readUint32() !== CIRTREE_MAGIC) {
    throw new Error("Invalid BBI primary R-tree magic or byte order");
  }

  const blockSize = reader.readUint32();
  const itemCount = reader.readUint64();
  reader.skip(16); // Overall genomic bounds are informational for traversal.
  reader.readUint64(); // End of the indexed file data.
  const itemsPerSlot = reader.readUint32();
  reader.skip(4);

  if (blockSize === 0 || (itemCount > 0n && itemsPerSlot === 0)) {
    throw new Error("Invalid BBI primary R-tree dimensions");
  }

  return {
    blockSize,
    itemCount,
    rootOffset: addUint64Offset(indexOffset, CIRTREE_HEADER_SIZE, "BBI file offset"),
  };
}

async function findOverlappingBlocks(
  url: string,
  header: BbiHeader,
  tree: CirTreeHeader,
  nodeOffset: bigint,
  query: BbiQuery,
  signal: AbortSignal | undefined,
  blocks: BlockReference[],
): Promise<void> {
  const nodeHeaderBytes = await readExactRange(url, nodeOffset, CIRTREE_NODE_HEADER_SIZE, signal);
  const nodeHeader = new BinaryReader(nodeHeaderBytes, header.byteOrder);
  const nodeType = nodeHeader.readUint8();
  nodeHeader.readUint8();
  const count = nodeHeader.readUint16();

  if (nodeType !== 0 && nodeType !== 1) {
    throw new Error("Invalid BBI primary R-tree node type");
  }
  if (count > tree.blockSize) {
    throw new Error("BBI primary R-tree node exceeds its block size");
  }

  const itemSize = nodeType === 1 ? CIRTREE_LEAF_ITEM_SIZE : CIRTREE_INTERNAL_ITEM_SIZE;
  if (count === 0) return;
  const bodyLength = checkedByteLength(count, itemSize, "Tree node body length");
  const bodyBytes = await readExactRange(
    url,
    addUint64Offset(nodeOffset, CIRTREE_NODE_HEADER_SIZE, "BBI file offset"),
    bodyLength,
    signal,
  );
  const body = new BinaryReader(bodyBytes, header.byteOrder);

  if (nodeType === 1) {
    for (let index = 0; index < count; index += 1) {
      const range = parseIndexedRange(body);
      const offset = body.readUint64();
      const size = body.readUint64();
      if (overlaps(query, range)) blocks.push({ offset, size });
    }
    return;
  }

  const children: Array<{ range: IndexedRange; offset: bigint }> = [];
  for (let index = 0; index < count; index += 1) {
    children.push({ range: parseIndexedRange(body), offset: body.readUint64() });
  }
  for (const child of children) {
    if (overlaps(query, child.range)) {
      await findOverlappingBlocks(url, header, tree, child.offset, query, signal, blocks);
    }
  }
}

export async function findPrimaryDataBlocks(
  url: string,
  header: BbiHeader,
  query: BbiQuery,
  signal?: AbortSignal,
): Promise<BlockReference[]> {
  const indexBytes = await readExactRange(
    url,
    header.unzoomedIndexOffset,
    CIRTREE_HEADER_SIZE,
    signal,
  );
  const tree = parseCirTreeHeader(indexBytes, header.byteOrder, header.unzoomedIndexOffset);
  if (tree.itemCount === 0n) return [];

  const references: BlockReference[] = [];
  await findOverlappingBlocks(url, header, tree, tree.rootOffset, query, signal, references);
  return references;
}
