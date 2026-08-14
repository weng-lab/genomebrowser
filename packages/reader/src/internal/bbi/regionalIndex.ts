import { addUint64Offset, checkedByteLength } from "../bigint";
import { BinaryReader, type ByteOrder } from "../binaryReader";
import { readBoundedRange, readExactRange, type ExactRangeOptions } from "../httpRange";
import type { BbiHeader } from "./commonHeader";

// Wire constants and layout follow UCSC's public sig.h and cirTree.h/cirTree.c.
const CIRTREE_MAGIC = 0x2468ace0;
const CIRTREE_HEADER_SIZE = 48n;
const CIRTREE_NODE_HEADER_SIZE = 4n;
const CIRTREE_INTERNAL_ITEM_SIZE = 24n;
const CIRTREE_LEAF_ITEM_SIZE = 32n;
const INITIAL_R_TREE_NODE_READ_AHEAD_SPAN = 4n * 1024n;
const MAXIMUM_R_TREE_NODE_READ_AHEAD_SPAN = 1024n * 1024n;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

export type BbiQuery = {
  chromosomeId: number;
  start: number;
  end: number;
};

export type BlockReference = {
  offset: bigint;
  size: bigint;
};

export type PrimaryRTreeHeader = {
  indexOffset: bigint;
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

function maximumNodeReadAheadLength(blockSize: number): bigint | undefined {
  const maximumNodeLength = CIRTREE_NODE_HEADER_SIZE + BigInt(blockSize) * CIRTREE_LEAF_ITEM_SIZE;
  return maximumNodeLength <= MAXIMUM_R_TREE_NODE_READ_AHEAD_SPAN ? maximumNodeLength : undefined;
}

function parseCirTreeHeader(
  bytes: Uint8Array,
  byteOrder: ByteOrder,
  indexOffset: bigint,
): PrimaryRTreeHeader {
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
    indexOffset,
    blockSize,
    itemCount,
    rootOffset: addUint64Offset(indexOffset, CIRTREE_HEADER_SIZE, "BBI file offset"),
  };
}

async function findOverlappingBlocks(
  url: string,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  nodeOffset: bigint,
  query: BbiQuery,
  options: ExactRangeOptions | undefined,
  blocks: BlockReference[],
): Promise<void> {
  const resourceSize = options?.metadata?.resourceSize;
  const maximumNodeLength = maximumNodeReadAheadLength(tree.blockSize);
  const maximumInitialReadLength =
    maximumNodeLength !== undefined && maximumNodeLength < INITIAL_R_TREE_NODE_READ_AHEAD_SPAN
      ? maximumNodeLength
      : INITIAL_R_TREE_NODE_READ_AHEAD_SPAN;
  let readAheadLength: bigint | undefined;
  if (maximumNodeLength !== undefined && resourceSize !== undefined) {
    if (nodeOffset >= resourceSize) {
      throw new RangeError("BBI primary R-tree node offset is outside the resource");
    }
    const remainingResourceLength = resourceSize - nodeOffset;
    if (remainingResourceLength < CIRTREE_NODE_HEADER_SIZE) {
      throw new RangeError("BBI primary R-tree node header is truncated");
    }
    const boundedLength =
      remainingResourceLength < maximumInitialReadLength
        ? remainingResourceLength
        : maximumInitialReadLength;
    if (nodeOffset <= MAX_UINT64 - boundedLength + 1n) {
      readAheadLength = boundedLength;
    }
  } else if (maximumNodeLength !== undefined && nodeOffset <= MAX_UINT64 - maximumNodeLength + 1n) {
    readAheadLength = maximumInitialReadLength;
  }
  const nodeBytes =
    readAheadLength === undefined
      ? await readExactRange(url, nodeOffset, CIRTREE_NODE_HEADER_SIZE, options)
      : await readBoundedRange(url, nodeOffset, CIRTREE_NODE_HEADER_SIZE, readAheadLength, options);

  const node = new BinaryReader(nodeBytes, header.byteOrder);
  const nodeType = node.readUint8();
  node.readUint8();
  const count = node.readUint16();

  if (nodeType !== 0 && nodeType !== 1) {
    throw new Error("Invalid BBI primary R-tree node type");
  }
  if (count > tree.blockSize) {
    throw new Error("BBI primary R-tree node exceeds its block size");
  }

  const itemSize = nodeType === 1 ? CIRTREE_LEAF_ITEM_SIZE : CIRTREE_INTERNAL_ITEM_SIZE;
  if (count === 0) return;
  const bodyLength = checkedByteLength(count, itemSize, "Tree node body length");
  const completeNodeLength = CIRTREE_NODE_HEADER_SIZE + bodyLength;
  if (
    readAheadLength !== undefined &&
    resourceSize !== undefined &&
    completeNodeLength > resourceSize - nodeOffset
  ) {
    throw new Error("BBI primary R-tree node body is truncated");
  }
  let bodyBytes =
    readAheadLength === undefined
      ? await readExactRange(
          url,
          addUint64Offset(nodeOffset, CIRTREE_NODE_HEADER_SIZE, "BBI file offset"),
          bodyLength,
          options,
        )
      : nodeBytes.subarray(
          Number(CIRTREE_NODE_HEADER_SIZE),
          Number(CIRTREE_NODE_HEADER_SIZE + bodyLength),
        );
  if (readAheadLength !== undefined && BigInt(bodyBytes.byteLength) < bodyLength) {
    const missingBodyLength = bodyLength - BigInt(bodyBytes.byteLength);
    const suffixOffset = addUint64Offset(
      nodeOffset,
      BigInt(nodeBytes.byteLength),
      "BBI file offset",
    );
    const suffixBytes = await readExactRange(url, suffixOffset, missingBodyLength, options);
    const completeBody = new Uint8Array(Number(bodyLength));
    completeBody.set(bodyBytes);
    completeBody.set(suffixBytes, bodyBytes.byteLength);
    bodyBytes = completeBody;
  }
  if (BigInt(bodyBytes.byteLength) !== bodyLength) {
    throw new Error("BBI primary R-tree node body is truncated");
  }
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
      await findOverlappingBlocks(url, header, tree, child.offset, query, options, blocks);
    }
  }
}

export async function readPrimaryRTreeHeader(
  url: string,
  header: BbiHeader,
  indexOffset: bigint,
  options?: ExactRangeOptions,
): Promise<PrimaryRTreeHeader> {
  const indexBytes = await readExactRange(url, indexOffset, CIRTREE_HEADER_SIZE, options);
  return parseCirTreeHeader(indexBytes, header.byteOrder, indexOffset);
}

export async function findPrimaryDataBlocks(
  url: string,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  query: BbiQuery,
  options?: ExactRangeOptions,
): Promise<BlockReference[]> {
  if (tree.itemCount === 0n) return [];

  const references: BlockReference[] = [];
  await findOverlappingBlocks(url, header, tree, tree.rootOffset, query, options, references);
  return references;
}
