import { addUint64Offset, checkedByteLength } from "../bigint";
import { BinaryReader, type ByteOrder } from "../binaryReader";
import type { ExactRangeOptions } from "../httpRange";
import { RequestRangeReader } from "../requestRangeReader";
import type { BbiHeader } from "./commonHeader";

// Wire constants and layout follow UCSC's public sig.h and cirTree.h/cirTree.c.
const CIRTREE_MAGIC = 0x2468ace0;
const CIRTREE_HEADER_SIZE = 48n;
const CIRTREE_NODE_HEADER_SIZE = 4n;
const CIRTREE_INTERNAL_ITEM_SIZE = 24n;
const CIRTREE_LEAF_ITEM_SIZE = 32n;
const PRIMARY_R_TREE_BOOTSTRAP_SPAN = 2n * 1024n;
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

export type ParsedPrimaryRTreeNode =
  | {
      readonly type: "leaf";
      readonly items: readonly Readonly<{
        range: IndexedRange;
        offset: bigint;
        size: bigint;
      }>[];
    }
  | {
      readonly type: "internal";
      readonly children: readonly Readonly<{ range: IndexedRange; offset: bigint }>[];
    };

export type PrimaryRTreeBootstrap = {
  tree: PrimaryRTreeHeader;
  root?: ParsedPrimaryRTreeNode;
};

type GenomicPosition = {
  readonly chromosomeId: number;
  readonly base: number;
};

type IndexedRange = {
  readonly start: GenomicPosition;
  readonly end: GenomicPosition;
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
  return Object.freeze({
    start: Object.freeze({ chromosomeId: reader.readUint32(), base: reader.readUint32() }),
    end: Object.freeze({ chromosomeId: reader.readUint32(), base: reader.readUint32() }),
  });
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

async function readPrimaryRTreeNode(
  requestReader: RequestRangeReader,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  nodeOffset: bigint,
  initialNodeBytes?: Uint8Array,
): Promise<ParsedPrimaryRTreeNode> {
  const resourceSize = requestReader.resourceSize;
  const maximumNodeLength = maximumNodeReadAheadLength(tree.blockSize);
  const maximumInitialReadLength =
    maximumNodeLength !== undefined && maximumNodeLength < INITIAL_R_TREE_NODE_READ_AHEAD_SPAN
      ? maximumNodeLength
      : INITIAL_R_TREE_NODE_READ_AHEAD_SPAN;
  let readAheadLength =
    initialNodeBytes === undefined ? undefined : BigInt(initialNodeBytes.byteLength);
  if (
    initialNodeBytes === undefined &&
    maximumNodeLength !== undefined &&
    resourceSize !== undefined
  ) {
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
  } else if (
    initialNodeBytes === undefined &&
    maximumNodeLength !== undefined &&
    nodeOffset <= MAX_UINT64 - maximumNodeLength + 1n
  ) {
    readAheadLength = maximumInitialReadLength;
  }
  const nodeBytes =
    initialNodeBytes ??
    (readAheadLength === undefined
      ? await requestReader.readExact(nodeOffset, CIRTREE_NODE_HEADER_SIZE)
      : await requestReader.readBounded(nodeOffset, CIRTREE_NODE_HEADER_SIZE, readAheadLength));

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
  if (count === 0) {
    return nodeType === 1
      ? Object.freeze({ type: "leaf", items: Object.freeze([]) })
      : Object.freeze({ type: "internal", children: Object.freeze([]) });
  }
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
      ? await requestReader.readExact(
          addUint64Offset(nodeOffset, CIRTREE_NODE_HEADER_SIZE, "BBI file offset"),
          bodyLength,
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
    const suffixBytes = await requestReader.readExact(suffixOffset, missingBodyLength);
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
    const items: Array<{ range: IndexedRange; offset: bigint; size: bigint }> = [];
    for (let index = 0; index < count; index += 1) {
      const range = parseIndexedRange(body);
      const offset = body.readUint64();
      const size = body.readUint64();
      items.push(Object.freeze({ range, offset, size }));
    }
    return Object.freeze({ type: "leaf", items: Object.freeze(items) });
  }

  const children: Array<{ range: IndexedRange; offset: bigint }> = [];
  for (let index = 0; index < count; index += 1) {
    children.push(Object.freeze({ range: parseIndexedRange(body), offset: body.readUint64() }));
  }
  return Object.freeze({ type: "internal", children: Object.freeze(children) });
}

async function findOverlappingBlocks(
  requestReader: RequestRangeReader,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  nodeOffset: bigint,
  query: BbiQuery,
  blocks: BlockReference[],
  initialNode?: ParsedPrimaryRTreeNode,
): Promise<void> {
  const node = initialNode ?? (await readPrimaryRTreeNode(requestReader, header, tree, nodeOffset));
  if (node.type === "leaf") {
    for (const item of node.items) {
      if (overlaps(query, item.range)) blocks.push({ offset: item.offset, size: item.size });
    }
    return;
  }

  for (const child of node.children) {
    if (overlaps(query, child.range)) {
      await findOverlappingBlocks(requestReader, header, tree, child.offset, query, blocks);
    }
  }
}

export async function readPrimaryRTreeHeader(
  url: string,
  header: BbiHeader,
  indexOffset: bigint,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
): Promise<PrimaryRTreeHeader> {
  const reader = requestReader ?? new RequestRangeReader(url, options);
  const indexBytes = await reader.readExact(indexOffset, CIRTREE_HEADER_SIZE);
  return parseCirTreeHeader(indexBytes, header.byteOrder, indexOffset);
}

export async function bootstrapPrimaryRTree(
  url: string,
  header: BbiHeader,
  indexOffset: bigint,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
): Promise<PrimaryRTreeBootstrap> {
  const reader = requestReader ?? new RequestRangeReader(url, options);
  const resourceSize = reader.resourceSize;
  let bootstrapLength = PRIMARY_R_TREE_BOOTSTRAP_SPAN;
  if (resourceSize !== undefined) {
    if (indexOffset >= resourceSize) {
      throw new RangeError("BBI primary R-tree index offset is outside the resource");
    }
    const remainingResourceLength = resourceSize - indexOffset;
    if (remainingResourceLength < CIRTREE_HEADER_SIZE) {
      throw new RangeError("BBI primary R-tree header is truncated");
    }
    if (remainingResourceLength < bootstrapLength) bootstrapLength = remainingResourceLength;
  }
  if (indexOffset > MAX_UINT64 - bootstrapLength + 1n) {
    return {
      tree: await readPrimaryRTreeHeader(url, header, indexOffset, options, reader),
    };
  }

  const bootstrapBytes = await reader.readBounded(
    indexOffset,
    CIRTREE_HEADER_SIZE,
    bootstrapLength,
  );
  const tree = parseCirTreeHeader(
    bootstrapBytes.subarray(0, Number(CIRTREE_HEADER_SIZE)),
    header.byteOrder,
    indexOffset,
  );
  if (tree.itemCount === 0n || maximumNodeReadAheadLength(tree.blockSize) === undefined) {
    return { tree };
  }

  let rootBytes = bootstrapBytes.slice(Number(CIRTREE_HEADER_SIZE));
  if (rootBytes.byteLength < Number(CIRTREE_NODE_HEADER_SIZE)) {
    const missingHeaderLength = CIRTREE_NODE_HEADER_SIZE - BigInt(rootBytes.byteLength);
    const suffixOffset = addUint64Offset(
      indexOffset,
      BigInt(bootstrapBytes.byteLength),
      "BBI file offset",
    );
    const suffix = await reader.readExact(suffixOffset, missingHeaderLength);
    const completeHeader = new Uint8Array(Number(CIRTREE_NODE_HEADER_SIZE));
    completeHeader.set(rootBytes);
    completeHeader.set(suffix, rootBytes.byteLength);
    rootBytes = completeHeader;
  }
  const root = await readPrimaryRTreeNode(reader, header, tree, tree.rootOffset, rootBytes);
  return { tree, root };
}

export async function readPrimaryRTreeRoot(
  url: string,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
): Promise<ParsedPrimaryRTreeNode> {
  const reader = requestReader ?? new RequestRangeReader(url, options);
  return readPrimaryRTreeNode(reader, header, tree, tree.rootOffset);
}

export async function findPrimaryDataBlocks(
  url: string,
  header: BbiHeader,
  tree: PrimaryRTreeHeader,
  query: BbiQuery,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
  root?: ParsedPrimaryRTreeNode,
): Promise<BlockReference[]> {
  if (tree.itemCount === 0n) return [];

  const references: BlockReference[] = [];
  const reader = requestReader ?? new RequestRangeReader(url, options);
  await findOverlappingBlocks(reader, header, tree, tree.rootOffset, query, references, root);
  return references;
}
