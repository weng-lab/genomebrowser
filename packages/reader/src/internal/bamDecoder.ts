import type { BamCigarSegment, BamCigarOperation, BamRecord } from "../bam";

/**
 * Decodes BAM alignment records out of inflated BGZF data.
 *
 * This is the hot path - a deeply covered window holds thousands of records -
 * so it walks a DataView by explicit offset rather than going through
 * BinaryReader, and it skips the optional tag block entirely.
 */

/** CIGAR operations, indexed by their four-bit code. */
const CIGAR_OPERATIONS = "MIDNSHP=X" as const;
/** Sequence nucleotides, indexed by their four-bit code. */
const SEQUENCE_NUCLEOTIDES = "=ACMGRSVTWYHKDBN" as const;

const FLAG_UNMAPPED = 0x4;
const FLAG_REVERSE_STRAND = 0x10;

/**
 * Fixed-size fields ahead of the read name: refID, pos, l_read_name, mapq, bin,
 * n_cigar_op, flag, l_seq, next_refID, next_pos, and tlen.
 */
const RECORD_FIXED_BYTES = 32;

/** CIGAR operations that advance along the reference. */
function consumesReference(operation: BamCigarOperation): boolean {
  return (
    operation === "M" ||
    operation === "D" ||
    operation === "N" ||
    operation === "=" ||
    operation === "X"
  );
}

export type DecodeBamRecordsOptions = {
  /** Only records on this reference are kept. */
  referenceId: number;
  /** Name to stamp on each record, from the BAM header. */
  chromosome: string;
  /** Half-open query interval; records that do not overlap it are dropped. */
  regionStart: number;
  regionEnd: number;
};

/**
 * Decodes records between two indices of the joined buffer. A record starting
 * before `to` is decoded in full even when it extends past it, because chunk
 * boundaries fall between record starts, not inside records.
 */
export function decodeBamRecords(
  data: Uint8Array,
  from: number,
  to: number,
  options: DecodeBamRecordsOptions,
): BamRecord[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const records: BamRecord[] = [];
  const limit = Math.min(to, data.length);
  let cursor = from;

  while (cursor + 4 <= limit) {
    const blockSize = view.getInt32(cursor, true);
    if (blockSize < RECORD_FIXED_BYTES) {
      throw new Error("Invalid BAM record: the record is shorter than its fixed fields");
    }
    const recordStart = cursor + 4;
    const recordEnd = recordStart + blockSize;
    if (recordEnd > data.length) break; // truncated tail of the fetched range

    const referenceId = view.getInt32(recordStart, true);
    const position = view.getInt32(recordStart + 4, true);
    const readNameLength = view.getUint8(recordStart + 8);
    const mappingQuality = view.getUint8(recordStart + 9);
    const cigarOperationCount = view.getUint16(recordStart + 12, true);
    const flag = view.getUint16(recordStart + 14, true);
    const sequenceLength = view.getInt32(recordStart + 16, true);

    cursor = recordEnd;

    // Unmapped records carry no usable interval even when they sort into the
    // region through their mate's position.
    if (referenceId !== options.referenceId || (flag & FLAG_UNMAPPED) !== 0 || position < 0) {
      continue;
    }

    const nameStart = recordStart + RECORD_FIXED_BYTES;
    const cigarStart = nameStart + readNameLength;
    const sequenceStart = cigarStart + cigarOperationCount * 4;

    const cigar: BamCigarSegment[] = [];
    let referenceSpan = 0;
    for (let index = 0; index < cigarOperationCount; index++) {
      const packed = view.getUint32(cigarStart + index * 4, true);
      const operation = CIGAR_OPERATIONS[packed & 0xf] as BamCigarOperation | undefined;
      if (operation === undefined) {
        throw new Error("Invalid BAM record: unknown CIGAR operation");
      }
      const length = packed >>> 4;
      cigar.push({ operation, length });
      if (consumesReference(operation)) referenceSpan += length;
    }

    // A record with no CIGAR still covers its own start base.
    const end = position + Math.max(referenceSpan, 1);
    if (end <= options.regionStart || position >= options.regionEnd) continue;

    // Two bases per byte, high nibble first.
    const sequence =
      sequenceLength > 0
        ? Array.from({ length: sequenceLength }, (_unused, index) => {
            const packed = data[sequenceStart + (index >> 1)]!;
            return SEQUENCE_NUCLEOTIDES[index % 2 === 0 ? packed >> 4 : packed & 0xf]!;
          }).join("")
        : "";

    records.push({
      chromosome: options.chromosome,
      start: position,
      end,
      name: decodeReadName(data, nameStart, readNameLength),
      flag,
      mappingQuality,
      strand: (flag & FLAG_REVERSE_STRAND) === 0 ? "+" : "-",
      cigar,
      sequence,
    });
  }

  return records;
}

const textDecoder = new TextDecoder();

/** Read names are NUL-terminated; the stored length counts the terminator. */
function decodeReadName(data: Uint8Array, start: number, length: number): string {
  if (length <= 1) return "";
  return textDecoder.decode(data.subarray(start, start + length - 1));
}
