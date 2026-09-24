// Adapted from weng-lab/bigwig-reader src/bam (MIT, Copyright 2018 weng-lab).
import type { BamCigarOperation, BamRecord } from "../bam";
import type { GenomicRegion } from "../genomicFile";
import { BinaryReader } from "./binaryReader";

const CIGAR = "MIDNSHP=X";
const BASES = "=ACMGRSVTWYHKDBN";

export function decodeBamRecords(
  bytes: Uint8Array,
  references: { name: string; length: number }[],
  refId: number,
  region: GenomicRegion,
): BamRecord[] {
  const reader = new BinaryReader(bytes, "little-endian");
  const records: BamRecord[] = [];
  while (reader.remaining > 0) {
    const size = reader.readUint32();
    if (size < 32 || size > reader.remaining) throw new Error("Invalid or truncated BAM record");
    const endPosition = reader.position + size;
    const record = new BinaryReader(bytes.subarray(reader.position, endPosition), "little-endian");
    reader.seek(endPosition);
    const reference = record.readUint32() | 0;
    const start = record.readUint32() | 0;
    const nameLength = record.readUint8();
    const mappingQuality = record.readUint8();
    record.skip(2); // bin
    const cigarCount = record.readUint16();
    const flags = record.readUint16();
    const sequenceLength = record.readUint32() | 0;
    const mateRef = record.readUint32() | 0;
    const mateStart = record.readUint32() | 0;
    const templateLength = record.readUint32() | 0;
    if (
      sequenceLength < 0 ||
      nameLength < 1 ||
      nameLength + cigarCount * 4 + Math.ceil(sequenceLength / 2) + sequenceLength >
        record.remaining
    )
      throw new Error("Invalid BAM record lengths");
    const nameBytes = bytes.subarray(
      endPosition - size + record.position,
      endPosition - size + record.position + nameLength,
    );
    if (nameBytes.at(-1) !== 0) throw new Error("Invalid BAM read name");
    const readName = new TextDecoder().decode(nameBytes.subarray(0, -1));
    record.skip(nameLength);
    const cigar: BamCigarOperation[] = [];
    let sequenceOffset = 0;
    let referenceOffset = 0;
    for (let i = 0; i < cigarCount; i++) {
      const raw = record.readUint32();
      const op = CIGAR[raw & 15] as BamCigarOperation["op"] | undefined;
      const length = raw >>> 4;
      if (!op || length === 0) throw new Error("Invalid BAM CIGAR operation");
      cigar.push({ op, length, sequenceOffset, referenceOffset });
      if ("MIS=X".includes(op)) sequenceOffset += length;
      if ("MDN=X".includes(op)) referenceOffset += length;
    }
    // The two-operation placeholder encodes the real CIGAR in CG:B:I.
    if (
      cigar.length === 2 &&
      cigar[0].op === "S" &&
      cigar[0].length === sequenceLength &&
      cigar[1].op === "N"
    )
      throw new Error("BAM long CIGAR (CG tag) is not supported");
    if (sequenceLength > 0 && cigarCount > 0 && sequenceOffset !== sequenceLength)
      throw new Error("BAM CIGAR and sequence lengths differ");
    const end = start + Math.max(referenceOffset, 1);
    if (
      reference !== refId ||
      (flags & 4) !== 0 ||
      start < 0 ||
      start >= region.end ||
      end <= region.start
    )
      continue;
    const sequence: string[] = [];
    for (let i = 0; i < Math.ceil(sequenceLength / 2); i++) {
      const packed = record.readUint8();
      sequence.push(BASES[packed >> 4]);
      if (sequence.length < sequenceLength) sequence.push(BASES[packed & 15]);
    }
    const qualities = Array.from({ length: sequenceLength }, () => record.readUint8());
    if (mateRef < -1 || mateRef >= references.length) throw new Error("Invalid BAM mate reference");
    records.push({
      chromosome: region.chromosome,
      start,
      end,
      readName,
      flags,
      strand: flags & 16 ? "-" : "+",
      mappingQuality,
      cigar,
      sequence: sequence.join(""),
      phredQualities: qualities.every((quality) => quality === 255) ? null : qualities,
      mate:
        mateRef < 0
          ? null
          : {
              chromosome: references[mateRef].name,
              start: mateStart,
              strand: flags & 32 ? "-" : "+",
              unmapped: (flags & 8) !== 0,
            },
      templateLength,
    });
  }
  return records;
}
