// Adapted from weng-lab/bigwig-reader src/bam (MIT, Copyright 2018 weng-lab).
import { BinaryReader } from "./binaryReader";

export type BamChunk = { start: bigint; end: bigint };
export type BamIndex = { bins: Map<number, BamChunk[]>; linear: bigint[] }[];

export function parseBamIndex(bytes: Uint8Array): BamIndex {
  const reader = new BinaryReader(bytes, "little-endian");
  if (reader.readUint32() !== 0x01494142) throw new Error("Expected a BAI index");
  const count = reader.readUint32();
  if (count > reader.remaining / 8) throw new Error("Invalid BAI reference count");
  const references: BamIndex = [];
  for (let ref = 0; ref < count; ref++) {
    const bins = new Map<number, BamChunk[]>();
    const binCount = reader.readUint32();
    if (binCount > reader.remaining / 8) throw new Error("Invalid BAI bin count");
    for (let i = 0; i < binCount; i++) {
      const bin = reader.readUint32();
      const chunkCount = reader.readUint32();
      if (bin > 37450 || bins.has(bin) || chunkCount > reader.remaining / 16)
        throw new Error("Invalid BAI bin");
      const chunks: BamChunk[] = [];
      for (let j = 0; j < chunkCount; j++) {
        const start = reader.readUint64();
        const end = reader.readUint64();
        if (bin !== 37450 && start > end) throw new Error("Invalid BAI chunk");
        if (bin !== 37450 && start < end) chunks.push({ start, end });
      }
      bins.set(bin, chunks);
    }
    const intervalCount = reader.readUint32();
    if (intervalCount > reader.remaining / 8) throw new Error("Invalid BAI linear index");
    const linear = Array.from({ length: intervalCount }, () => reader.readUint64());
    references.push({ bins, linear });
  }
  if (reader.remaining !== 0 && reader.remaining !== 8) throw new Error("Invalid BAI trailer");
  return references;
}

export function bamChunks(index: BamIndex[number], start: number, end: number): BamChunk[] {
  const bins = [0];
  for (const [offset, shift] of [
    [1, 26],
    [9, 23],
    [73, 20],
    [585, 17],
    [4681, 14],
  ]) {
    for (let bin = offset + (start >> shift); bin <= offset + ((end - 1) >> shift); bin++)
      bins.push(bin);
  }
  const minimum = index.linear[start >> 14] ?? 0n;
  const chunks = bins
    .flatMap((bin) => index.bins.get(bin) ?? [])
    .filter((chunk) => chunk.end > minimum)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const merged: BamChunk[] = [];
  for (const chunk of chunks) {
    const last = merged.at(-1);
    if (last && chunk.start <= last.end) {
      if (chunk.end > last.end) last.end = chunk.end;
    } else merged.push({ ...chunk });
  }
  return merged;
}
