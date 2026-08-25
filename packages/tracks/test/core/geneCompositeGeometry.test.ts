import { describe, expect, it } from "vitest";
import { createCompositeGeneGeometry, createCompositeIntronRuns } from "../../src/gene/geometry";
import type {
  CompositeGeneContribution,
  CompositeGeneIntronPart,
  CompositeGenePart,
  CompositeGenePartMetadata,
  GeneUtrSide,
} from "../../src/gene/geometry";
import type { GeneExon, GeneStrand, GeneTranscript, GroupedGene } from "../../src/gene/types";

describe("Composite gene geometry", () => {
  it("resolves exon conflicts by CDS, UTR, and noncoding precedence without losing metadata", () => {
    const geometry = createCompositeGeneGeometry(
      group([
        transcript("coding-a", [{ start: 100, end: 200, frame: 0 }], 130, 170),
        transcript("coding-b", [{ start: 120, end: 180, frame: 1 }], 150, 180),
        transcript("noncoding", [{ start: 125, end: 175, frame: -1 }], 125, 125),
      ]),
    );

    expect(geometry.exonParts).toEqual([
      part("utr", 100, 120, [contribution("coding-a", "utr", "5-prime")]),
      part("utr", 120, 125, [
        contribution("coding-a", "utr", "5-prime"),
        contribution("coding-b", "utr", "5-prime"),
      ]),
      part(
        "utr",
        125,
        130,
        [contribution("coding-a", "utr", "5-prime"), contribution("coding-b", "utr", "5-prime")],
        [contribution("noncoding", "noncoding-exon")],
      ),
      part(
        "cds",
        130,
        150,
        [contribution("coding-a", "cds")],
        [contribution("coding-b", "utr", "5-prime"), contribution("noncoding", "noncoding-exon")],
      ),
      part(
        "cds",
        150,
        170,
        [contribution("coding-a", "cds"), contribution("coding-b", "cds")],
        [contribution("noncoding", "noncoding-exon")],
      ),
      part(
        "cds",
        170,
        175,
        [contribution("coding-b", "cds")],
        [contribution("coding-a", "utr", "3-prime"), contribution("noncoding", "noncoding-exon")],
      ),
      part(
        "cds",
        175,
        180,
        [contribution("coding-b", "cds")],
        [contribution("coding-a", "utr", "3-prime")],
      ),
      part("utr", 180, 200, [contribution("coding-a", "utr", "3-prime")]),
    ]);
  });

  it("lets an alternative exon replace overlapping intron coverage", () => {
    const geometry = createCompositeGeneGeometry(
      group([
        transcript(
          "spliced",
          [
            { start: 100, end: 120, frame: -1 },
            { start: 180, end: 200, frame: -1 },
          ],
          100,
          100,
        ),
        transcript("alternative", [{ start: 140, end: 160, frame: -1 }], 140, 140),
      ]),
    );

    expect(geometry.introns).toEqual([
      part("intron", 120, 140, [contribution("spliced", "intron")]),
      part("intron", 160, 180, [contribution("spliced", "intron")]),
    ]);
    expect(geometry.exonParts).toContainEqual(
      part(
        "noncoding-exon",
        140,
        160,
        [contribution("alternative", "noncoding-exon")],
        [contribution("spliced", "intron")],
      ),
    );
  });

  it("keeps metadata atoms while joining adjacent intron coverage into one visual run", () => {
    const atoms: CompositeGeneIntronPart[] = [
      part("intron", 120, 140, [contribution("long-intron", "intron")]),
      part("intron", 140, 180, [
        contribution("long-intron", "intron"),
        contribution("short-intron", "intron"),
      ]),
    ];

    expect(createCompositeIntronRuns(atoms)).toEqual([{ kind: "intron", start: 120, end: 180 }]);
  });

  it("merges adjacent equivalent parts but keeps contributor boundaries", () => {
    const primary = transcript(
      "primary",
      [
        { start: 100, end: 150, frame: -1 },
        { start: 150, end: 200, frame: -1 },
      ],
      100,
      100,
    );
    expect(createCompositeGeneGeometry(group([primary])).exonParts).toEqual([
      part("noncoding-exon", 100, 200, [contribution("primary", "noncoding-exon")]),
    ]);

    const geometry = createCompositeGeneGeometry(
      group([primary, transcript("supporting", [{ start: 150, end: 200, frame: -1 }], 150, 150)]),
    );

    expect(geometry.exonParts).toEqual([
      part("noncoding-exon", 100, 150, [contribution("primary", "noncoding-exon")]),
      part("noncoding-exon", 150, 200, [
        contribution("primary", "noncoding-exon"),
        contribution("supporting", "noncoding-exon"),
      ]),
    ]);
  });
});

function part<Kind extends CompositeGenePart["kind"]>(
  kind: Kind,
  start: number,
  end: number,
  winningContributions: CompositeGeneContribution[],
  overriddenContributions: CompositeGeneContribution[] = [],
): { kind: Kind; start: number; end: number; metadata: CompositeGenePartMetadata } {
  const utrSides = (["5-prime", "3-prime"] as const).filter((side) =>
    winningContributions.some((part) => part.utrSide === side),
  ) as GeneUtrSide[];
  return {
    kind,
    start,
    end,
    metadata: { winningContributions, overriddenContributions, utrSides },
  };
}

function contribution(
  transcriptId: string,
  kind: "intron" | "utr" | "cds" | "noncoding-exon",
  utrSide: "5-prime" | "3-prime" | null = null,
): CompositeGeneContribution {
  return { transcriptId, kind, utrSide };
}

function group(transcripts: GeneTranscript[]): GroupedGene {
  return {
    kind: "gene",
    chromosome: "chr1",
    start: Math.min(...transcripts.map((item) => item.start)),
    end: Math.max(...transcripts.map((item) => item.end)),
    strand: "+",
    geneId: "gene1",
    geneName: "GENE1",
    transcripts,
  };
}

function transcript(
  transcriptId: string,
  exons: GeneExon[],
  thickStart: number,
  thickEnd: number,
  strand: GeneStrand = "+",
): GeneTranscript {
  const start = exons[0]!.start;
  const end = exons.at(-1)!.end;
  return {
    kind: "transcript",
    chromosome: "chr1",
    start,
    end,
    strand,
    transcriptId,
    geneId: "gene1",
    geneName: "GENE1",
    exons,
    source: {
      chromosome: "chr1",
      start,
      end,
      name: transcriptId,
      score: 0,
      strand,
      thickStart,
      thickEnd,
      reserved: "0",
      blockCount: exons.length,
      blockSizes: exons.map((exon) => exon.end - exon.start),
      chromStarts: exons.map((exon) => exon.start - start),
      name2: transcriptId,
      cdsStartStat: "cmpl",
      cdsEndStat: "cmpl",
      exonFrames: exons.map((exon) => exon.frame),
      type: thickStart < thickEnd ? "coding" : "noncoding",
      geneName: "gene1",
      geneName2: "GENE1",
      geneType: thickStart < thickEnd ? "protein_coding" : "noncoding",
      fields: [],
    },
  };
}
