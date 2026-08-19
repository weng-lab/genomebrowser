import { describe, expect, expectTypeOf, it } from "vitest";
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
} from "@weng-lab/genomebrowser-tracks/cave";
import {
  methylCModule,
  type MethylCConfig,
  type MethylCCreateInput,
} from "@weng-lab/genomebrowser-tracks/methylc";
import {
  transcriptModule,
  type TranscriptConfig,
  type TranscriptCreateInput,
} from "@weng-lab/genomebrowser-tracks/transcript";

describe("first-party track package", () => {
  it("exports all six pre-bound modules as a ready-made collection", () => {
    expect(firstPartyTrackModules).toEqual([
      bigBedModule,
      bigWigModule,
      bulkBedModule,
      caveModule,
      methylCModule,
      transcriptModule,
    ]);
    expect(firstPartyTrackModules.map((module) => module.type)).toEqual([
      "bigbed",
      "bigwig",
      "bulkbed",
      "cave",
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
    expect(
      transcriptModule.create(input("transcript", { assembly: "GRCh38", version: 40 })).config,
    ).toMatchObject({ canonicalColor: "#000000", highlightColor: "#000000" });
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
    expectTypeOf<BulkBedCreateInput>().toEqualTypeOf<Parameters<typeof bulkBedModule.create>[0]>();
    expectTypeOf<BulkBedConfig>().toEqualTypeOf<
      ReturnType<typeof bulkBedModule.validate>["config"]
    >();
    expectTypeOf<CaveCreateInput>().toEqualTypeOf<Parameters<typeof caveModule.create>[0]>();
    expectTypeOf<CaveConfig>().toEqualTypeOf<ReturnType<typeof caveModule.validate>["config"]>();
    expectTypeOf<MethylCCreateInput>().toEqualTypeOf<Parameters<typeof methylCModule.create>[0]>();
    expectTypeOf<MethylCConfig>().toEqualTypeOf<
      ReturnType<typeof methylCModule.validate>["config"]
    >();
    expectTypeOf<TranscriptCreateInput>().toEqualTypeOf<
      Parameters<typeof transcriptModule.create>[0]
    >();
    expectTypeOf<TranscriptConfig>().toEqualTypeOf<
      ReturnType<typeof transcriptModule.validate>["config"]
    >();
  });
});

function input<Type extends string, Config>(type: Type, config: Config) {
  return { id: type, title: type, config };
}
