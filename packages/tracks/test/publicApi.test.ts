import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  BigWigRecord,
  BigWigSummaryRecord,
  BigWigValueRecord,
} from "@weng-lab/genomic-reader";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import {
  bigBedModule,
  type BigBedConfig,
  type BigBedCreateInput,
} from "@weng-lab/genomebrowser-tracks/bigbed";
import {
  bigWigModule,
  type BigWigConfig,
  type BigWigCreateInput,
  type BigWigData,
} from "@weng-lab/genomebrowser-tracks/bigwig";
import {
  bulkBedModule,
  type BulkBedConfig,
  type BulkBedCreateInput,
} from "@weng-lab/genomebrowser-tracks/bulkbed";
import {
  caveModule,
  type CaveConfig,
  type CaveCreateInput,
  type CaveData,
} from "@weng-lab/genomebrowser-tracks/cave";
import { ccreBigBedModule } from "@weng-lab/genomebrowser-tracks/ccre";
import {
  geneModule,
  type GeneConfig,
  type GeneCreateInput,
} from "@weng-lab/genomebrowser-tracks/gene";
import {
  methylCModule,
  type MethylCConfig,
  type MethylCCreateInput,
  type MethylCData,
} from "@weng-lab/genomebrowser-tracks/methylc";
import {
  transcriptModule,
  type TranscriptConfig,
  type TranscriptCreateInput,
} from "@weng-lab/genomebrowser-tracks/transcript";
import { condenseSignalRecords, type SignalPoint } from "@weng-lab/genomebrowser-tracks/shared";

describe("first-party track package", () => {
  it("exports all eight pre-bound modules as a ready-made collection", () => {
    expect(firstPartyTrackModules).toEqual([
      bigBedModule,
      bigWigModule,
      bulkBedModule,
      caveModule,
      ccreBigBedModule,
      geneModule,
      methylCModule,
      transcriptModule,
    ]);
    expect(firstPartyTrackModules.map((module) => module.type)).toEqual([
      "bigbed",
      "bigwig",
      "bulkbed",
      "cave",
      "ccre-bigbed",
      "gene",
      "methylc",
      "transcript",
    ]);
    for (const module of firstPartyTrackModules) {
      expect(module.configSchema).toBeDefined();
      expect(module.createInputSchema).toBeDefined();
      expect(module.settingsComponent).toBeTypeOf("function");
      expect(module.tooltipComponent).toBeTypeOf("function");
    }
  });

  it("preserves validated defaults at the package boundary", () => {
    expect(bigBedModule.create(input("bigbed", { url: "YOUR_URL_HERE" }))).toMatchObject({
      base: { height: 12 },
      config: { rowHeight: 12 },
    });
    expect(
      bulkBedModule.create(
        input("bulkbed", { datasets: [{ name: "Dataset", url: "YOUR_URL_HERE" }] }),
      ).config,
    ).toMatchObject({ rowHeight: 12 });
    expect(bigWigModule.create(input("bigwig", { url: "YOUR_URL_HERE" })).config).toMatchObject({
      fillWithZero: false,
      showClampIndicators: true,
      clampIndicatorColor: "#ff0000",
    });
    expect(
      caveModule.create(
        input("cave", { neurotransmitter: "GABA" as const, age: "Adulthood" as const }),
      ).config,
    ).toMatchObject({ topColor: "#000000", bottomColor: "#000000" });
    expect(geneModule.create(input("gene", { url: "YOUR_URL_HERE" })).config).toMatchObject({
      canonicalColor: "#000000",
      highlightColor: "#000000",
      rowHeight: 12,
    });
    expect(
      transcriptModule.create(input("transcript", { assembly: "GRCh38", version: 40 })).config,
    ).toMatchObject({ canonicalColor: "#000000", highlightColor: "#000000", rowHeight: 12 });
  });

  it("derives create-input and validated config types from each module", () => {
    expectTypeOf<BigBedCreateInput>().toEqualTypeOf<Parameters<typeof bigBedModule.create>[0]>();
    expectTypeOf<BigBedConfig>().toEqualTypeOf<
      ReturnType<typeof bigBedModule.validate>["config"]
    >();
    expectTypeOf<BigWigCreateInput>().toEqualTypeOf<Parameters<typeof bigWigModule.create>[0]>();
    expectTypeOf<BigWigConfig>().toEqualTypeOf<
      ReturnType<typeof bigWigModule.validate>["config"]
    >();
    expectTypeOf<BigWigData>().toEqualTypeOf<BigWigRecord[]>();
    expectTypeOf<BulkBedCreateInput>().toEqualTypeOf<Parameters<typeof bulkBedModule.create>[0]>();
    expectTypeOf<BulkBedConfig>().toEqualTypeOf<
      ReturnType<typeof bulkBedModule.validate>["config"]
    >();
    expectTypeOf<CaveCreateInput>().toEqualTypeOf<Parameters<typeof caveModule.create>[0]>();
    expectTypeOf<CaveConfig>().toEqualTypeOf<ReturnType<typeof caveModule.validate>["config"]>();
    expectTypeOf<CaveData>().toEqualTypeOf<{ top: BigWigRecord[]; bottom: BigWigRecord[] }>();
    expectTypeOf<GeneCreateInput>().toEqualTypeOf<Parameters<typeof geneModule.create>[0]>();
    expectTypeOf<GeneConfig>().toEqualTypeOf<ReturnType<typeof geneModule.validate>["config"]>();
    expectTypeOf<MethylCCreateInput>().toEqualTypeOf<Parameters<typeof methylCModule.create>[0]>();
    expectTypeOf<MethylCConfig>().toEqualTypeOf<
      ReturnType<typeof methylCModule.validate>["config"]
    >();
    expectTypeOf<MethylCData>().toEqualTypeOf<BigWigRecord[][]>();
    expectTypeOf<TranscriptCreateInput>().toEqualTypeOf<
      Parameters<typeof transcriptModule.create>[0]
    >();
    expectTypeOf<TranscriptConfig>().toEqualTypeOf<
      ReturnType<typeof transcriptModule.validate>["config"]
    >();
  });

  it("exposes the shared signal condensation API", () => {
    const records = [{ kind: "value" as const, chromosome: "chr1", start: 0, end: 1, value: 2 }];
    const points: SignalPoint[] = condenseSignalRecords(
      records,
      { chromosome: "chr1", start: 0, end: 1 },
      1,
    );

    expect(points).toEqual([{ x: 0, min: 2, max: 2 }]);
    expectTypeOf(condenseSignalRecords)
      .parameter(0)
      .toEqualTypeOf<readonly (BigWigValueRecord | BigWigSummaryRecord)[]>();
    expectTypeOf(points).toEqualTypeOf<SignalPoint[]>();
  });
});

function input<Type extends string, Config>(type: Type, config: Config) {
  return { id: type, title: type, config };
}
