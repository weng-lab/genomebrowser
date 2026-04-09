import { TrackType } from "@weng-lab/genomebrowser";
import { describe, expect, it } from "vitest";
import { createBiosampleTrack } from "../src/TrackSelect/Folders/biosamples/shared/toTrack";
import { createGeneTrack } from "../src/TrackSelect/Folders/genes/shared/toTrack";
import { createMohdTrack } from "../src/TrackSelect/Folders/mohd/shared/toTrack";
import { createOtherTrack } from "../src/TrackSelect/Folders/other-tracks/shared/toTrack";

describe("folder track creation helpers", () => {
  it("creates a transcript track for gene rows", () => {
    const track = createGeneTrack(
      {
        id: "gencode-basic",
        displayName: "GENCODE Basic",
        versions: [29, 48],
      },
      { assembly: "GRCh38" },
    );

    expect(track.trackType).toBe(TrackType.Transcript);
    expect(track.id).toBe("gencode-basic");
    expect("assembly" in track ? track.assembly : undefined).toBe("GRCh38");
    expect("version" in track ? track.version : undefined).toBe(48);
  });

  it("creates the expected track types for biosample rows", () => {
    const ccreTrack = createBiosampleTrack(
      {
        id: "ccre-aggregate",
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
        id: "wgbs-sample",
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
        id: "atac-sample",
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
        id: "sample::wgbs",
        sampleId: "sample",
        assay: "WGBS",
        fileName: "sample.wgbs",
        fileType: "methylC",
        urls: {
          plusStrand: {
            cpg: "https://example.test/plus.cpg.bw",
            chg: "https://example.test/plus.chg.bw",
            chh: "https://example.test/plus.chh.bw",
            depth: "https://example.test/plus.depth.bw",
          },
          minusStrand: {
            cpg: "https://example.test/minus.cpg.bw",
            chg: "https://example.test/minus.chg.bw",
            chh: "https://example.test/minus.chh.bw",
            depth: "https://example.test/minus.depth.bw",
          },
        },
      },
      { assembly: "GRCh38" },
    );
    const signalTrack = createMohdTrack(
      {
        id: "sample::signal",
        sampleId: "sample",
        assay: "ATAC",
        fileName: "sample.bigWig",
        fileType: "bigWig",
        url: "https://example.test/sample.bigWig",
      },
      { assembly: "GRCh38" },
    );

    expect(wgbsTrack?.trackType).toBe(TrackType.MethylC);
    expect(signalTrack?.trackType).toBe(TrackType.BigWig);
  });

  it("creates supported custom tracks and ignores unsupported rows", () => {
    const supportedTrack = createOtherTrack(
      {
        id: "tf-peaks",
        name: "TF Peaks",
        description: "Supported custom track",
      },
      { assembly: "GRCh38" },
    );
    const unsupportedTrack = createOtherTrack(
      {
        id: "unsupported-track",
        name: "Unsupported",
        description: "Should not create a track",
      },
      { assembly: "GRCh38" },
    );

    expect(supportedTrack?.id).toBe("custom-tf-peaks");
    expect(supportedTrack?.trackType).toBe(TrackType.Custom);
    expect(unsupportedTrack).toBeNull();
  });
});
