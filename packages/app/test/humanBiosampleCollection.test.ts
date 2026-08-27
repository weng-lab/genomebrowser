import { describe, expect, it } from "vitest";
import { humanBiosampleCollection } from "../lib/humanBiosampleCollection";

const tracksById = new Map(humanBiosampleCollection.tracks.map((track) => [track.id, track]));

describe("Human Biosamples track titles", () => {
  it("distinguishes aggregate assays and ends each title with its display mode", () => {
    expect([
      tracksById.get("ccre-aggregate")?.title,
      tracksById.get("dnase-aggregate")?.title,
      tracksById.get("h3k4me3-aggregate")?.title,
      tracksById.get("h3k27ac-aggregate")?.title,
      tracksById.get("ctcf-aggregate")?.title,
      tracksById.get("atac-aggregate")?.title,
    ]).toEqual([
      "Aggregate data, all ENCODE Biosamples, cCRE (dense)",
      "Aggregate data, all ENCODE Biosamples, DNase (full)",
      "Aggregate data, all ENCODE Biosamples, H3K4me3 (full)",
      "Aggregate data, all ENCODE Biosamples, H3K27ac (full)",
      "Aggregate data, all ENCODE Biosamples, CTCF (full)",
      "Aggregate data, all ENCODE Biosamples, ATAC (full)",
    ]);
  });

  it("distinguishes related tracks by assay and file accession when needed", () => {
    expect([
      tracksById.get("ccre-ENCFF922YMQ")?.title,
      tracksById.get("h3k27ac-ENCFF922YMQ")?.title,
      tracksById.get("wgbs-ENCSR539UBP")?.title,
      tracksById.get("rnaseq-ENCFF668DGV")?.title,
      tracksById.get("rnaseq-ENCFF912ZWS")?.title,
    ]).toEqual([
      "Adipose tissue, male adult (34 years), cCRE (dense)",
      "Adipose tissue, male adult (34 years), H3K27ac (full)",
      "Adipose tissue, male adult (34 years), WGBS (split)",
      "Mesenteric fat pad, female adult (59 years), RNA-seq, ENCFF668DGV (full)",
      "Mesenteric fat pad, female adult (59 years), RNA-seq, ENCFF912ZWS (full)",
    ]);
  });
});
