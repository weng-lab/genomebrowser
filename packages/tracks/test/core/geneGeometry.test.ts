import { describe, expect, it } from "vitest";
import { createGeneTranscriptGeometry } from "../../src/gene/geometry";
import type { GeneTranscript } from "../../src/gene/types";

describe("Gene transcript geometry", () => {
  it("splits coding exons into UTR and CDS parts with negative-strand transcription indices", () => {
    const geometry = createGeneTranscriptGeometry(
      transcript({ strand: "-", thickStart: 120, thickEnd: 210 }),
    );

    expect(geometry.introns).toEqual([
      {
        kind: "intron",
        start: 130,
        end: 150,
        metadata: { intronIndex: 0, transcriptionIndex: 1 },
      },
      {
        kind: "intron",
        start: 180,
        end: 200,
        metadata: { intronIndex: 1, transcriptionIndex: 0 },
      },
    ]);
    expect(geometry.exonParts).toEqual([
      exonPart("utr", 100, 120, 0, 2, 0, "3-prime"),
      exonPart("cds", 120, 130, 0, 2, 0),
      exonPart("cds", 150, 180, 1, 1, 1),
      exonPart("cds", 200, 210, 2, 0, 2),
      exonPart("utr", 210, 230, 2, 0, 2, "5-prime"),
    ]);
  });

  it("assigns UTR sides in transcription order on both strands", () => {
    const positive = createGeneTranscriptGeometry(
      transcript({ strand: "+", thickStart: 120, thickEnd: 210 }),
    );
    const negative = createGeneTranscriptGeometry(
      transcript({ strand: "-", thickStart: 120, thickEnd: 210 }),
    );

    expect(utrSides(positive)).toEqual(["5-prime", "3-prime"]);
    expect(utrSides(negative)).toEqual(["3-prime", "5-prime"]);
  });

  it("represents every exon as noncoding when the thick interval is empty", () => {
    const geometry = createGeneTranscriptGeometry(
      transcript({ strand: "+", thickStart: 100, thickEnd: 100 }),
    );

    expect(geometry.exonParts).toEqual([
      exonPart("noncoding-exon", 100, 130, 0, 0, 0),
      exonPart("noncoding-exon", 150, 180, 1, 1, 1),
      exonPart("noncoding-exon", 200, 230, 2, 2, 2),
    ]);
  });

  it("does not create an intron between adjacent exon blocks", () => {
    const source = transcript({ strand: "+", thickStart: 100, thickEnd: 230 });
    source.exons = [
      { start: 100, end: 130, frame: 0 },
      { start: 130, end: 180, frame: 1 },
    ];

    expect(createGeneTranscriptGeometry(source).introns).toEqual([]);
  });
});

function exonPart(
  kind: "utr" | "cds" | "noncoding-exon",
  start: number,
  end: number,
  exonIndex: number,
  transcriptionIndex: number,
  frame: -1 | 0 | 1 | 2,
  side?: "5-prime" | "3-prime",
) {
  const metadata = { exonIndex, transcriptionIndex, frame };
  return kind === "utr"
    ? { kind, start, end, metadata: { ...metadata, side } }
    : { kind, start, end, metadata };
}

function utrSides(geometry: ReturnType<typeof createGeneTranscriptGeometry>) {
  return geometry.exonParts.filter((part) => part.kind === "utr").map((part) => part.metadata.side);
}

function transcript({
  strand,
  thickStart,
  thickEnd,
}: Pick<GeneTranscript, "strand"> & { thickStart: number; thickEnd: number }): GeneTranscript {
  const exons = [
    { start: 100, end: 130, frame: 0 as const },
    { start: 150, end: 180, frame: 1 as const },
    { start: 200, end: 230, frame: 2 as const },
  ];
  return {
    kind: "transcript",
    chromosome: "chr1",
    start: 100,
    end: 230,
    strand,
    transcriptId: "tx1",
    geneId: "gene1",
    geneName: "GENE1",
    exons,
    source: {
      chromosome: "chr1",
      start: 100,
      end: 230,
      name: "tx1",
      score: 0,
      strand,
      thickStart,
      thickEnd,
      reserved: "0",
      blockCount: 3,
      blockSizes: [30, 30, 30],
      chromStarts: [0, 50, 100],
      name2: "tx1",
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: [0, 1, 2],
      type: "coding",
      geneName: "gene1",
      geneName2: "GENE1",
      geneType: "protein_coding",
      fields: [],
    },
  };
}
