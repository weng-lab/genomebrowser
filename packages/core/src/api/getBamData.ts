import { AxiosDataLoader, BamReader } from "genomic-reader";
import { BamRect } from "../components/tracks/bam/types";
import { TrackDataState } from "../store/dataStore";

export interface BamAlignment {
  chr: string;
  start: number;
  flags: number;
  strand: boolean;
  readName: string;
  cigarOps: Array<CigarOp>;
  templateLength: number;
  mappingQuality: number;
  seq: string;
  phredQualities: Array<number>;
  lengthOnRef: number;
}

export interface CigarOp {
  opLen: number;
  op: string;
  seqOffset: number;
}

export async function getBamData(
  bamUrl: string,
  baiUrl: string,
  chr: string,
  start: number,
  end: number
): Promise<TrackDataState<BamAlignment[]>> {
  try {
    const reader = new BamReader(new AxiosDataLoader(bamUrl), new AxiosDataLoader(baiUrl));
    const header = await reader.getHeaderData();

    // Normalize chr name to match BAM file convention
    const chroms = Object.keys(header.chromToId);
    const hasChrPrefix = chroms.some((c) => c.startsWith("chr"));
    const normalizedChr =
      hasChrPrefix && !chr.startsWith("chr")
        ? `chr${chr}`
        : !hasChrPrefix && chr.startsWith("chr")
          ? chr.slice(3)
          : chr;

    if (header.chromToId[normalizedChr] === undefined) {
      return {
        data: null,
        error: `Chromosome "${chr}" not found. Available: ${chroms.slice(0, 5).join(", ")}...`,
      };
    }

    const alignments = await reader.read(normalizedChr, start, end);
    return { data: alignments as BamAlignment[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch BAM data",
    };
  }
}

const CONSUMES_REFERENCE = new Set(["M", "D", "N", "=", "X"]);

export function transformBamAlignments(alignments: BamAlignment[]): BamRect[] {
  return alignments.map((alignment) => {
    // Calculate CIGAR operation positions on the reference
    const cigarOps: BamRect["cigarOps"] = [];
    let refPos = alignment.start;

    for (const op of alignment.cigarOps) {
      const opStart = refPos;
      const consumesRef = CONSUMES_REFERENCE.has(op.op);
      const opEnd = consumesRef ? refPos + op.opLen : refPos;

      cigarOps.push({
        opStart,
        opEnd,
        op: op.op,
      });

      if (consumesRef) {
        refPos += op.opLen;
      }
    }

    return {
      start: alignment.start,
      end: alignment.start + alignment.lengthOnRef,
      strand: alignment.strand,
      seq: alignment.seq,
      name: alignment.readName,
      cigarOps,
    };
  });
}
