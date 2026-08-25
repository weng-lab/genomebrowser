import type { GeneExon, GeneTranscript } from "./types";

export type GeneExonPartKind = "utr" | "cds" | "noncoding-exon";
export type GeneUtrSide = "5-prime" | "3-prime";

type GeneExonPartBase = {
  start: number;
  end: number;
  metadata: {
    exonIndex: number;
    transcriptionIndex: number;
    frame: GeneExon["frame"];
  };
};

export type GeneUtrPart = GeneExonPartBase & {
  kind: "utr";
  metadata: GeneExonPartBase["metadata"] & { side: GeneUtrSide };
};

export type GeneCdsPart = GeneExonPartBase & { kind: "cds" };
export type GeneNoncodingExonPart = GeneExonPartBase & { kind: "noncoding-exon" };
export type GeneExonPart = GeneUtrPart | GeneCdsPart | GeneNoncodingExonPart;

export type GeneIntronPart = {
  kind: "intron";
  start: number;
  end: number;
  metadata: {
    intronIndex: number;
    transcriptionIndex: number;
  };
};

export type GeneTranscriptGeometry = {
  introns: GeneIntronPart[];
  exonParts: GeneExonPart[];
};

export function createGeneTranscriptGeometry(transcript: GeneTranscript): GeneTranscriptGeometry {
  const { exons } = transcript;
  const codingStart = transcript.source.thickStart;
  const codingEnd = transcript.source.thickEnd;
  const isCoding = codingStart < codingEnd;
  const exonParts = exons.flatMap((exon, exonIndex): GeneExonPart[] => {
    const metadata = {
      exonIndex,
      transcriptionIndex: transcriptionIndex(exonIndex, exons.length, transcript.strand),
      frame: exon.frame,
    };
    if (!isCoding) return [{ kind: "noncoding-exon", start: exon.start, end: exon.end, metadata }];

    const parts: GeneExonPart[] = [];
    addUtrPart(
      parts,
      exon.start,
      Math.min(exon.end, codingStart),
      metadata,
      transcript.strand === "+" ? "5-prime" : "3-prime",
    );
    addExonPart(
      parts,
      "cds",
      Math.max(exon.start, codingStart),
      Math.min(exon.end, codingEnd),
      metadata,
    );
    addUtrPart(
      parts,
      Math.max(exon.start, codingEnd),
      exon.end,
      metadata,
      transcript.strand === "+" ? "3-prime" : "5-prime",
    );
    return parts;
  });
  const introns = exons.slice(0, -1).flatMap((exon, intronIndex): GeneIntronPart[] => {
    const end = exons[intronIndex + 1]!.start;
    if (exon.end >= end) return [];
    return [
      {
        kind: "intron",
        start: exon.end,
        end,
        metadata: {
          intronIndex,
          transcriptionIndex: transcriptionIndex(intronIndex, exons.length - 1, transcript.strand),
        },
      },
    ];
  });

  return { introns, exonParts };
}

function addExonPart(
  parts: GeneExonPart[],
  kind: "cds" | "noncoding-exon",
  start: number,
  end: number,
  metadata: GeneExonPartBase["metadata"],
) {
  if (start < end) parts.push({ kind, start, end, metadata });
}

function addUtrPart(
  parts: GeneExonPart[],
  start: number,
  end: number,
  metadata: GeneExonPartBase["metadata"],
  side: GeneUtrSide,
) {
  if (start < end) parts.push({ kind: "utr", start, end, metadata: { ...metadata, side } });
}

function transcriptionIndex(
  index: number,
  count: number,
  strand: GeneTranscript["strand"],
): number {
  return strand === "+" ? index : count - index - 1;
}
