import { addUint64Offset, checkedByteLength } from "../bigint";
import { BinaryReader, type ByteOrder } from "../binaryReader";
import type { ExactRangeOptions } from "../httpRange";
import { RequestRangeReader } from "../requestRangeReader";
import type { BbiHeader } from "./commonHeader";

// Layout follows UCSC's public bPlusTree.h. UCSC's bPlusTree.c writes each
// internal key as the least key in its child, so lookup selects the last key <= target.
const B_PLUS_TREE_MAGIC = 0x78ca8c91;
const B_PLUS_TREE_HEADER_SIZE = 32n;
const B_PLUS_TREE_NODE_HEADER_SIZE = 4n;
const CHROMOSOME_VALUE_SIZE = 8;
const MAXIMUM_B_PLUS_TREE_NODE_READ_AHEAD_SPAN = 1024n * 1024n;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

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
    rootOffset: addUint64Offset(treeOffset, B_PLUS_TREE_HEADER_SIZE, "BBI file offset"),
  };
}

function comparePaddedKey(target: Uint8Array, key: Uint8Array): number {
  for (let index = 0; index < key.byteLength; index += 1) {
    const difference = (target[index] ?? 0) - key[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function maximumNodeReadAheadLength(tree: BPlusTreeHeader): bigint | undefined {
  const itemSize = BigInt(tree.keySize + CHROMOSOME_VALUE_SIZE);
  const maximumNodeLength = B_PLUS_TREE_NODE_HEADER_SIZE + BigInt(tree.blockSize) * itemSize;
  return maximumNodeLength <= MAXIMUM_B_PLUS_TREE_NODE_READ_AHEAD_SPAN
    ? maximumNodeLength
    : undefined;
}

export async function lookupChromosome(
  url: string,
  header: BbiHeader,
  chromosome: string,
  options?: ExactRangeOptions,
  requestReader?: RequestRangeReader,
): Promise<Chromosome | undefined> {
  const reader = requestReader ?? new RequestRangeReader(url, options);
  const treeBytes = await reader.readExact(header.chromosomeTreeOffset, B_PLUS_TREE_HEADER_SIZE);
  const tree = parseTreeHeader(treeBytes, header.byteOrder, header.chromosomeTreeOffset);
  const target = new TextEncoder().encode(chromosome);
  if (target.byteLength > tree.keySize || tree.itemCount === 0n) return undefined;

  const maximumNodeLength = maximumNodeReadAheadLength(tree);
  let nodeOffset = tree.rootOffset;
  for (;;) {
    const readAheadLength =
      maximumNodeLength !== undefined && nodeOffset <= MAX_UINT64 - maximumNodeLength + 1n
        ? maximumNodeLength
        : undefined;
    const nodeBytes =
      readAheadLength === undefined
        ? await reader.readExact(nodeOffset, B_PLUS_TREE_NODE_HEADER_SIZE)
        : await reader.readBounded(nodeOffset, B_PLUS_TREE_NODE_HEADER_SIZE, readAheadLength);
    const node = new BinaryReader(nodeBytes, header.byteOrder);
    const nodeType = node.readUint8();
    node.readUint8();
    const count = node.readUint16();

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
    const bodyLength = checkedByteLength(count, itemSize, "Tree node body length");
    const completeNodeLength = B_PLUS_TREE_NODE_HEADER_SIZE + bodyLength;
    if (
      readAheadLength !== undefined &&
      reader.resourceSize !== undefined &&
      completeNodeLength > reader.resourceSize - nodeOffset
    ) {
      throw new Error("Chromosome B+ tree node body is truncated");
    }
    let bodyBytes =
      readAheadLength === undefined
        ? await reader.readExact(
            addUint64Offset(nodeOffset, B_PLUS_TREE_NODE_HEADER_SIZE, "BBI file offset"),
            bodyLength,
          )
        : nodeBytes.subarray(
            Number(B_PLUS_TREE_NODE_HEADER_SIZE),
            Number(B_PLUS_TREE_NODE_HEADER_SIZE + bodyLength),
          );
    if (readAheadLength !== undefined && BigInt(bodyBytes.byteLength) < bodyLength) {
      const missingBodyLength = bodyLength - BigInt(bodyBytes.byteLength);
      const suffixOffset = addUint64Offset(
        nodeOffset,
        BigInt(nodeBytes.byteLength),
        "BBI file offset",
      );
      const suffixBytes = await reader.readExact(suffixOffset, missingBodyLength);
      const completeBody = new Uint8Array(Number(bodyLength));
      completeBody.set(bodyBytes);
      completeBody.set(suffixBytes, bodyBytes.byteLength);
      bodyBytes = completeBody;
    }
    if (BigInt(bodyBytes.byteLength) !== bodyLength) {
      throw new Error("Chromosome B+ tree node body is truncated");
    }
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
