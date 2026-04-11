import { TrackType } from "@weng-lab/genomebrowser";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { createBiosampleTrack } from "../src/TrackSelect/Folders/biosamples/shared/toTrack";
import { createGeneTrack } from "../src/TrackSelect/Folders/genes/shared/toTrack";
vi.mock("../src/TrackSelect/Folders/mohd/shared/MohdGroupingCell", () => ({
  MohdGroupingCell: () => null,
}));
vi.mock("../src/TrackSelect/Folders/mohd/shared/MohdTreeItem", () => ({
  MohdTreeItem: () => null,
}));
vi.mock("../src/TrackSelect/Folders/mohd/shared/MohdViewSelector", () => ({
  MohdViewSelector: () => null,
}));
import { humanMohdFolder } from "../src/TrackSelect/Folders/mohd/human";
import { createMohdTrack } from "../src/TrackSelect/Folders/mohd/shared/toTrack";
import { createOtherTrack } from "../src/TrackSelect/Folders/other-tracks/shared/toTrack";

describe("folder track creation helpers", () => {
  it("creates a transcript track for gene rows", () => {
    const track = createGeneTrack(
      {
        id: "human-genes/gencode-basic",
        displayName: "GENCODE Basic",
        versions: [29, 48],
      },
      { assembly: "GRCh38" },
    );

    expect(track.trackType).toBe(TrackType.Transcript);
    expect(track.id).toBe("human-genes/gencode-basic");
    expect("assembly" in track ? track.assembly : undefined).toBe("GRCh38");
    expect("version" in track ? track.version : undefined).toBe(48);
  });

  it("creates the expected track types for biosample rows", () => {
    const ccreTrack = createBiosampleTrack(
      {
        id: "human-biosamples/ccre-aggregate",
        assay: "cCRE",
        displayName: "cCRE Aggregate",
        ontology: "Cell line",
        lifeStage: "Adult",
        sampleType: "Cell line",
        experimentAccession: "ENCSR000AAA",
        collection: "Core",
        url: "https://example.test/ccre.bb",
      },
      { assembly: "GRCh38" },
    );
    const wgbsTrack = createBiosampleTrack(
      {
        id: "human-biosamples/wgbs-sample",
        assay: "WGBS",
        displayName: "WGBS Sample",
        ontology: "Cell line",
        lifeStage: "Adult",
        sampleType: "Cell line",
        experimentAccession: "ENCSR000AAB",
        collection: "Core",
        cpgPlus: "https://example.test/wgbs.plus.bw",
        cpgMinus: "https://example.test/wgbs.minus.bw",
        coverage: "https://example.test/wgbs.coverage.bw",
      },
      { assembly: "GRCh38" },
    );
    const atacTrack = createBiosampleTrack(
      {
        id: "human-biosamples/atac-sample",
        assay: "ATAC",
        displayName: "ATAC Sample",
        ontology: "Cell line",
        lifeStage: "Adult",
        sampleType: "Cell line",
        experimentAccession: "ENCSR000AAC",
        collection: "Core",
        url: "https://example.test/atac.bw",
      },
      { assembly: "GRCh38" },
    );

    expect(ccreTrack.trackType).toBe(TrackType.BigBed);
    expect(wgbsTrack.trackType).toBe(TrackType.MethylC);
    expect(atacTrack.trackType).toBe(TrackType.BigWig);
  });

  it("creates the expected track types for MOHD rows", () => {
    const wgbsTrack = createMohdTrack(
      {
        id: "human-mohd/sample",
        kind: "wgbs-methyl",
        sampleId: "sample",
        ome: "WGBS",
        site: "CCH",
        sex: "female",
        status: "case",
        description: "DNA Methylation",
        trackCategory: "Methylation",
        filenames: {
          plusStrand: {
            cpg: "sample_DNAme-CpG-plus.bigWig",
            chg: "sample_DNAme-CHG-plus.bigWig",
            chh: "sample_DNAme-CHH-plus.bigWig",
            depth: "sample_coverage-plus.bigWig",
          },
          minusStrand: {
            cpg: "sample_DNAme-CpG-minus.bigWig",
            chg: "sample_DNAme-CHG-minus.bigWig",
            chh: "sample_DNAme-CHH-minus.bigWig",
            depth: "sample_coverage-minus.bigWig",
          },
        },
      },
      { assembly: "GRCh38" },
    );
    const signalTrack = createMohdTrack(
      {
        id: "human-mohd/sample::signal",
        kind: "file",
        sampleId: "sample",
        ome: "ATAC",
        site: "CCH",
        sex: "female",
        status: "case",
        description: "Fold change signal",
        trackCategory: "Signal",
        filename: "sample.bigWig",
      },
      { assembly: "GRCh38" },
    );
    const bedTrack = createMohdTrack(
      {
        id: "human-mohd/sample::cytosines",
        kind: "file",
        sampleId: "sample",
        ome: "WGBS",
        site: "CCH",
        sex: "female",
        status: "case",
        description: "Cytosine-level DNA methylation measurements",
        trackCategory: "Annotation",
        filename: "sample_DNAme-cytosines.bigBed",
      },
      { assembly: "GRCh38" },
    );

    expect(wgbsTrack?.trackType).toBe(TrackType.MethylC);
    expect(wgbsTrack?.title).toBe("sample DNA Methylation");
    expect(
      "urls" in (wgbsTrack ?? {}) ? wgbsTrack?.urls.plusStrand.cpg.url : "",
    ).toBe(
      "https://downloads.mohdconsortium.org/1_WGBS/sample/sample_DNAme-CpG-plus.bigWig",
    );
    expect(signalTrack?.trackType).toBe(TrackType.BigWig);
    expect(signalTrack?.title).toBe("sample Fold change signal");
    expect("url" in (signalTrack ?? {}) ? signalTrack?.url : "").toBe(
      "https://downloads.mohdconsortium.org/2_ATAC/sample/sample.bigWig",
    );
    expect(bedTrack?.trackType).toBe(TrackType.BigBed);
    expect("url" in (bedTrack ?? {}) ? bedTrack?.url : "").toBe(
      "https://downloads.mohdconsortium.org/1_WGBS/sample/sample_DNAme-cytosines.bigBed",
    );
  });

  it("regroups WGBS rows into one methylation row plus one cytosines row", () => {
    const wgbsRows = humanMohdFolder.rows.filter(
      (row) => row.sampleId === "MOHD_EB100001",
    );

    expect(wgbsRows).toHaveLength(2);
    expect(wgbsRows.map((row) => row.description).sort()).toEqual([
      "Cytosine-level DNA methylation measurements",
      "DNA Methylation",
    ]);
    expect(
      wgbsRows.find((row) => row.description === "DNA Methylation")?.id,
    ).toBe("human-mohd/MOHD_EB100001");
    expect(
      wgbsRows.find((row) => row.description === "DNA Methylation")
        ?.trackCategory,
    ).toBe("Methylation");
  });

  it("keeps non-WGBS rows as one row per source file", () => {
    const atacRows = humanMohdFolder.rows.filter(
      (row) => row.sampleId === "MOHD_EA100001",
    );

    expect(atacRows).toHaveLength(4);
    expect(atacRows.every((row) => row.kind === "file")).toBe(true);
    expect(new Set(atacRows.map((row) => row.trackCategory))).toEqual(
      new Set(["Signal", "Annotation"]),
    );
  });

  it("derives track categories for MOHD rows", () => {
    const wgbsAnnotationRow = humanMohdFolder.rows.find(
      (row) =>
        row.sampleId === "MOHD_EB100001" &&
        row.description === "Cytosine-level DNA methylation measurements",
    );

    expect(wgbsAnnotationRow?.trackCategory).toBe("Annotation");
  });

  it("exposes an ome-first default MOHD view", () => {
    expect(humanMohdFolder.views).toEqual([
      expect.objectContaining({
        id: "ome",
        label: "Ome",
        groupingModel: ["ome", "site", "sampleId"],
        leafField: "description",
      }),
      expect.objectContaining({
        id: "site",
        label: "Site",
        groupingModel: ["site", "ome", "sampleId"],
        leafField: "description",
      }),
    ]);
    expect(humanMohdFolder.ViewSelector).toBeTruthy();
  });

  it("creates supported custom tracks and ignores unsupported rows", () => {
    const supportedTrack = createOtherTrack(
      {
        id: "human-other-tracks/tf-peaks",
        sourceId: "tf-peaks",
        name: "TF Peaks",
        description: "Supported custom track",
      },
      { assembly: "GRCh38" },
    );
    const unsupportedTrack = createOtherTrack(
      {
        id: "human-other-tracks/unsupported-track",
        sourceId: "unsupported-track",
        name: "Unsupported",
        description: "Should not create a track",
      },
      { assembly: "GRCh38" },
    );

    expect(supportedTrack?.id).toBe("human-other-tracks/tf-peaks");
    expect(supportedTrack?.trackType).toBe(TrackType.Custom);
    expect(unsupportedTrack).toBeNull();
  });
});
