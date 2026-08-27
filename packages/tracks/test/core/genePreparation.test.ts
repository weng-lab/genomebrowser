import { describe, expect, it } from "vitest";
import { prepareGeneTranscriptGlyph, prepareMergedGeneGlyph } from "../../src/gene/preparation";
import type { GeneExon, GeneTranscript, GroupedGene } from "../../src/gene/types";

describe("Gene glyph preparation", () => {
  it("creates source-neutral parts with stable IDs and typed transcript targets", () => {
    const feature = transcript();

    const first = prepareGeneTranscriptGlyph(feature);
    const second = prepareGeneTranscriptGlyph(feature);

    expect(first.geometry).toEqual(second.geometry);
    expect(first.geometry).toEqual({
      introns: [{ id: "intron-0", kind: "intron", start: 120, end: 150 }],
      exonParts: [
        { id: "utr-0-100-110", kind: "utr", start: 100, end: 110 },
        { id: "cds-0-110-120", kind: "cds", start: 110, end: 120 },
        { id: "cds-1-150-170", kind: "cds", start: 150, end: 170 },
        { id: "utr-1-170-180", kind: "utr", start: 170, end: 180 },
      ],
    });
    expect(first.targets.get("intron-0")).toEqual({
      kind: "part",
      feature,
      part: {
        kind: "intron",
        start: 120,
        end: 150,
        metadata: { intronIndex: 0, transcriptionIndex: 0 },
        source: "transcript",
      },
    });
  });

  it("keeps detailed merged intron segments on their run target", () => {
    const first = transcript();
    const second = transcript("tx2", [
      { start: 100, end: 120, frame: 0 },
      { start: 140, end: 160, frame: 1 },
      { start: 170, end: 180, frame: 2 },
    ]);
    const gene: GroupedGene = {
      kind: "gene",
      chromosome: "chr1",
      start: 100,
      end: 180,
      strand: "+",
      geneId: "gene1",
      geneName: "GENE1",
      transcripts: [first, second],
    };

    const prepared = prepareMergedGeneGlyph(gene);
    const intron = prepared.geometry.introns[0]!;
    const target = prepared.targets.get(intron.id);

    expect(target).toMatchObject({
      kind: "part",
      feature: gene,
      part: { kind: "intron", start: 120, end: 140, source: "merged" },
    });
    if (target?.kind !== "part" || target.part.source !== "merged") throw new Error("bad target");
    if (target.part.kind !== "intron") throw new Error("bad part");
    expect(target.part.segments.map(({ start, end }) => [start, end])).toEqual([[120, 140]]);
  });
});

function transcript(
  transcriptId = "tx1",
  exons: GeneExon[] = [
    { start: 100, end: 120, frame: 0 as const },
    { start: 150, end: 180, frame: 1 as const },
  ],
): GeneTranscript {
  return {
    kind: "transcript",
    chromosome: "chr1",
    start: 100,
    end: 180,
    strand: "+",
    transcriptId,
    transcriptName: transcriptId,
    geneId: "gene1",
    geneName: "GENE1",
    tags: [],
    attributes: {},
    exons,
    source: {
      chromosome: "chr1",
      start: 100,
      end: 180,
      name: transcriptId,
      score: 0,
      strand: "+",
      thickStart: 110,
      thickEnd: 170,
      reserved: "0",
      blockCount: exons.length,
      blockSizes: exons.map((exon) => exon.end - exon.start),
      chromStarts: exons.map((exon) => exon.start - 100),
      name2: transcriptId,
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: exons.map((exon) => exon.frame),
      type: "coding",
      geneName: "gene1",
      geneName2: "GENE1",
      geneType: "protein_coding",
      fields: [],
    },
  };
}
