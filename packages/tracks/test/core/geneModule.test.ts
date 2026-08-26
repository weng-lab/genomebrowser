import type { GenomicRegion, TrackFetchContext, TrackResources } from "@weng-lab/genomebrowser";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reader = vi.hoisted(() => ({ createBigBedFile: vi.fn() }));

vi.mock("@weng-lab/genomic-reader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@weng-lab/genomic-reader")>()),
  createBigBedFile: reader.createBigBedFile,
}));

import { fetchGene, parseBigGenePredRecord } from "../../src/gene/fetch";
import { geneModule } from "../../src/gene";
import { bigGenePredSchema } from "../../src/gene/schema";
import type { GeneConfig } from "../../src/gene/types";

const rawFields = {
  name: "ENST000001",
  score: "960",
  strand: "+",
  thickStart: "110",
  thickEnd: "190",
  reserved: "255,0,0",
  blockCount: "2",
  blockSizes: "20,50,",
  chromStarts: "0,50,",
  name2: "TP53-201",
  cdsStartStat: "cmpl",
  cdsEndStat: "cmpl",
  exonFrames: "0,1,",
  type: "coding",
  geneName: "ENSG000001",
  geneName2: "TP53",
  geneType: "protein_coding",
} as const;

function record(overrides: Record<string, unknown> = {}) {
  return {
    chromosome: "chr17",
    start: 100,
    end: 200,
    ...bigGenePredSchema.parse(rawFields),
    fields: [],
    ...overrides,
  };
}

function createResources(): TrackResources {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string) => values.get(key) as T | undefined,
    set: (key, value) => void values.set(key, value),
    delete: (key) => void values.delete(key),
    clear: () => void values.clear(),
  };
}

function context(
  url: string,
  resources: TrackResources,
  region: GenomicRegion,
): TrackFetchContext<GeneConfig> {
  return {
    track: {
      id: "genes",
      type: "gene",
      display: "pack",
      config: { url, highlightColor: "#000000", rowHeight: 12 },
    },
    demand: { assembly: { id: "test", chromosomes: { chr17: 1_000 } }, region, width: 100 },
    resources,
  };
}

describe("Gene module", () => {
  beforeEach(() => reader.createBigBedFile.mockReset());

  it("parses BED12+8 values into a transcript while retaining the source record", () => {
    const transcript = parseBigGenePredRecord(record());

    expect(transcript).toMatchObject({
      kind: "transcript",
      chromosome: "chr17",
      start: 100,
      end: 200,
      transcriptId: "ENST000001",
      geneId: "ENSG000001",
      geneName: "TP53",
      exons: [
        { start: 100, end: 120, frame: 0 },
        { start: 150, end: 200, frame: 1 },
      ],
      source: {
        blockCount: 2,
        blockSizes: [20, 50],
        chromStarts: [0, 50],
        exonFrames: [0, 1],
        reserved: "255,0,0",
        geneType: "protein_coding",
      },
    });
  });

  it("maps transcription-ordered negative-strand frames onto genomic-order exons", () => {
    const transcript = parseBigGenePredRecord(record({ strand: "-", exonFrames: [2, 0] }));

    expect(transcript.exons).toEqual([
      { start: 100, end: 120, frame: 0 },
      { start: 150, end: 200, frame: 2 },
    ]);
  });

  it("falls back to the gene label when geneName repeats the transcript identifier", () => {
    const transcript = parseBigGenePredRecord(
      record({ geneName: "ENST000001", geneName2: "TP53" }),
    );

    expect(transcript).toMatchObject({ geneId: "TP53", geneName: "TP53" });
  });

  it("rejects invalid item-RGB source values", () => {
    expect(() => bigGenePredSchema.parse({ ...rawFields, reserved: "256,0,0" })).toThrow(/R,G,B/);
  });

  it.each([
    ["mismatched block arrays", { blockCount: 3 }, /blockCount must match/],
    ["blocks outside the transcript", { blockSizes: [20, 60] }, /inside the transcript interval/],
    ["an invalid transcript interval", { end: 100 }, /end must be greater than start/],
    ["an invalid coding interval", { thickStart: 99 }, /thickStart must be inside/],
  ])("rejects %s", (_name, overrides, message) => {
    expect(() => parseBigGenePredRecord(record(overrides))).toThrow(message);
  });

  it("reuses the cached genomic reader for repeated file reads", async () => {
    const read = vi.fn().mockResolvedValue([record()]);
    reader.createBigBedFile.mockReturnValue({ read });
    const resources = createResources();
    const region = { chromosome: "chr17", start: 90, end: 210 };

    await fetchGene(context("https://example.org/genes.bb", resources, region));
    await fetchGene(context("https://example.org/genes.bb", resources, region));

    expect(reader.createBigBedFile).toHaveBeenCalledOnce();
    expect(reader.createBigBedFile).toHaveBeenCalledWith({
      url: "https://example.org/genes.bb",
      schema: bigGenePredSchema,
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledWith(region);
  });

  it("creates pack tracks with shared row-layout defaults and pre-bound UI", () => {
    const track = geneModule.create({
      id: "genes",
      title: "Genes",
      config: { url: "YOUR_URL_HERE" },
    });

    expect(track).toMatchObject({
      type: "gene",
      base: { display: "pack", height: 12, color: "#4b9560" },
      config: { url: "YOUR_URL_HERE", highlightColor: "#000000", rowHeight: 12 },
    });
    expect(geneModule.settingsComponent).toBeTypeOf("function");
    expect(geneModule.tooltipComponent).toBeTypeOf("function");
  });
});
