// Adapted from weng-lab/bigwig-reader src/bam (MIT, Copyright 2018 weng-lab).
import type { GenomicFile, GenomicRecord, ReadOptions } from "./genomicFile";
import { throwIfAborted } from "./internal/abort";
import { BamBgzfReader, BamHeaderReader } from "./internal/bamBgzf";
import { readBamChunks } from "./internal/bamChunkReader";
import { bamChunks, parseBamIndex, type BamIndex } from "./internal/bamIndex";
import { decodeBamRecords } from "./internal/bamDecoder";
import type { ExactRangeMetadata } from "./internal/httpRange";
import { validateHttpUrl, validateRegion } from "./internal/inputValidation";
import { RequestRangeReader } from "./internal/requestRangeReader";

export type BamFileOptions = { url: string; indexUrl: string };
export type BamCigarOperation = {
  op: "M" | "I" | "D" | "N" | "S" | "H" | "P" | "=" | "X";
  length: number;
  sequenceOffset: number;
  referenceOffset: number;
};
export type BamMate = { chromosome: string; start: number; strand: "+" | "-"; unmapped: boolean };
export type BamRecord = GenomicRecord & {
  readName: string;
  flags: number;
  strand: "+" | "-";
  mappingQuality: number;
  cigar: BamCigarOperation[];
  sequence: string;
  phredQualities: number[] | null;
  mate: BamMate | null;
  templateLength: number;
};
export interface BamFile extends GenomicFile<BamRecord> {
  getHeader(options?: ReadOptions): Promise<BamHeader>;
}
export type BamReference = { name: string; length: number };
export type BamHeader = { text: string; references: BamReference[] };

/** Read coordinate-sorted BAM alignments using a BAI index. */
export function createBamFile(options: BamFileOptions): BamFile {
  if (options === null || typeof options !== "object")
    throw new TypeError("BAM file options must be an object");
  const url = validateHttpUrl(options.url);
  const indexUrl = validateHttpUrl(options.indexUrl);
  const metadata: ExactRangeMetadata = {};
  let header: BamHeader | undefined;
  let index: BamIndex | undefined;
  async function loadHeader(signal?: AbortSignal): Promise<BamHeader> {
    throwIfAborted(signal);
    const loaded =
      header ??
      (await readHeader(new BamBgzfReader(new RequestRangeReader(url, { signal, metadata }))));
    throwIfAborted(signal);
    header = loaded;
    return loaded;
  }
  return {
    async getHeader(options) {
      const loaded = await loadHeader(options?.signal);
      throwIfAborted(options?.signal);
      return {
        text: loaded.text,
        references: loaded.references.map((reference) => ({ ...reference })),
      };
    },
    async read(region, options) {
      validateRegion(region);
      if (region.end > 2 ** 29) throw new RangeError("BAI regions must end at or before 2^29");
      const signal = options?.signal;
      throwIfAborted(signal);
      const { references } = await loadHeader(signal);
      throwIfAborted(signal);
      let refId = references.findIndex((ref) => ref.name === region.chromosome);
      if (refId < 0) {
        const alternate = region.chromosome.startsWith("chr")
          ? region.chromosome.slice(3)
          : `chr${region.chromosome}`;
        refId = references.findIndex((ref) => ref.name === alternate);
      }
      if (refId < 0 || region.start >= references[refId].length) return [];
      if (!index) {
        const response = await fetch(indexUrl, { signal });
        throwIfAborted(signal);
        if (response.status !== 200)
          throw new Error(`Expected a complete BAI response, received ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        throwIfAborted(signal);
        const loadedIndex = parseBamIndex(bytes);
        if (loadedIndex.length !== references.length)
          throw new Error("BAM and BAI reference counts differ");
        index = loadedIndex;
      }
      // Keep the cached header unchanged: concurrent reads can request either spelling.
      // The selected reference (including same-reference mates) uses the caller's name.
      const outputReferences = references.map((ref, id) =>
        id === refId ? { ...ref, name: region.chromosome } : ref,
      );
      const chunks = bamChunks(
        index[refId],
        region.start,
        Math.min(region.end, references[refId].length),
      );
      const records = (
        await readBamChunks(
          url,
          chunks,
          (bytes) => decodeBamRecords(bytes, outputReferences, refId, region),
          { signal, metadata },
        )
      ).flat();
      throwIfAborted(signal);
      return records.sort((a, b) => a.start - b.start || a.end - b.end);
    },
  };
}

async function readHeader(bgzf: BamBgzfReader): Promise<BamHeader> {
  const reader = new BamHeaderReader(bgzf);
  if ((await reader.int()) !== 0x014d4142) throw new Error("Expected a BAM file");
  const text = new TextDecoder().decode(await reader.bytes(await reader.int()));
  const count = await reader.int();
  if (count < 0) throw new Error("Invalid BAM reference count");
  const references: BamReference[] = [];
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    const nameBytes = await reader.bytes(await reader.int());
    if (nameBytes.length < 2 || nameBytes.at(-1) !== 0)
      throw new Error("Invalid BAM reference name");
    const name = new TextDecoder().decode(nameBytes.subarray(0, -1));
    const length = await reader.int();
    if (length <= 0 || names.has(name)) throw new Error("Invalid BAM reference");
    names.add(name);
    references.push({ name, length });
  }
  return { text, references };
}
