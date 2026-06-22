import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bigBedModule } from "../../src/tracks/bigbed/module";
import type { InferBigBedRow } from "../../src/tracks/bigbed/types";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import { bulkBedModule } from "../../src/tracks/bulkbed/module";
import { transcriptModule } from "../../src/tracks/transcript/module";

describe("defineTrackModule", () => {
  function FullRenderer() {
    return null;
  }

  function DenseRenderer() {
    return null;
  }

  function SettingsComponent() {
    return null;
  }

  function TooltipComponent() {
    return null;
  }

  const module = defineTrackModule({
    type: "example",
    defaults: {
      height: 80,
      color: "#2266aa",
    },
    configSchema: z.object({
      url: z.string().min(1),
      enabled: z.boolean().default(true),
    }),
    fetch: async () => null,
    render: {
      full: FullRenderer,
      dense: DenseRenderer,
    },
    settingsComponent: SettingsComponent,
    tooltipComponent: TooltipComponent,
  });

  it("creates typed configs from public input", () => {
    expect(
      module.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
      }),
    ).toEqual({
      id: "signal",
      type: "example",
      title: "Signal",
      url: "YOUR_URL_HERE",
      display: "full",
      height: 80,
      color: "#2266aa",
      enabled: true,
    });
  });

  it("validates full runtime configs", () => {
    const config = module.create({
      id: "signal",
      title: "Signal",
      url: "YOUR_URL_HERE",
    });

    expect(module.validate(config)).toEqual(config);
    expect(() => module.validate({ ...config, type: "other" })).toThrow(
      /example config is invalid/,
    );
  });

  it("preserves optional settings components", () => {
    expect(module.settingsComponent).toBe(SettingsComponent);
  });

  it("preserves optional tooltip components on modules", () => {
    expect(module.tooltipComponent).toBe(TooltipComponent);
  });

  it("rejects invalid display modes", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
        display: "expanded" as never,
      }),
    ).toThrow(/example config is invalid/);
  });

  it("rejects unknown config keys", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
        typo: true,
      }),
    ).toThrow(/example config is invalid/);
  });

  it("preserves top-level custom config schema refinements", () => {
    const rangeModule = defineTrackModule({
      type: "range",
      configSchema: z
        .object({
          min: z.number(),
          max: z.number(),
        })
        .refine((range) => range.min < range.max, {
          error: "min must be less than max",
        }),
      fetch: async () => null,
      render: {
        full: FullRenderer,
      },
    });

    expect(() =>
      rangeModule.create({
        id: "range",
        title: "Range",
        min: 10,
        max: 5,
      }),
    ).toThrow(/min must be less than max/);
  });

  it("rejects reserved custom config schema fields", () => {
    expect(() =>
      defineTrackModule({
        type: "reserved",
        configSchema: z.object({
          display: z.string(),
        }),
        fetch: async () => null,
        render: {
          full: FullRenderer,
        },
      }),
    ).toThrow(/cannot define reserved field "display"/);

    expect(() =>
      defineTrackModule({
        type: "reserved-interaction",
        configSchema: z.object({
          onClick: z.custom<Function>((value) => typeof value === "function"),
        }),
        fetch: async () => null,
        render: {
          full: FullRenderer,
        },
      }),
    ).toThrow(/cannot define reserved field "onClick"/);
  });

  it("supports interaction callback defaults and config overrides", () => {
    const onClick = () => undefined;
    const onHover = () => undefined;
    const onLeave = () => undefined;
    const overrideClick = () => undefined;
    const interactionModule = defineTrackModule({
      type: "interactive",
      defaults: {
        onClick,
        onHover,
        onLeave,
      },
      configSchema: z.object({}),
      fetch: async () => null,
      render: {
        full: FullRenderer,
      },
    });

    expect(
      interactionModule.create({
        id: "defaulted",
        title: "Defaulted",
      }),
    ).toMatchObject({ onClick, onHover, onLeave });

    expect(
      interactionModule.create({
        id: "override",
        title: "Override",
        onClick: overrideClick,
      }),
    ).toMatchObject({ onClick: overrideClick, onHover, onLeave });
  });

  it("rejects invalid interaction field values", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
        onClick: "not a function" as never,
      }),
    ).toThrow(/example config is invalid/);
  });

  it("rejects tooltip on configs", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
        tooltip: TooltipComponent,
      } as never),
    ).toThrow(/example config is invalid/);
  });

  it("rejects empty render maps", () => {
    expect(() =>
      defineTrackModule({
        type: "empty",
        configSchema: z.object({}),
        fetch: async () => null,
        render: {},
      }),
    ).toThrow(/must define at least one renderer/);
  });

  it("rejects invalid default displays", () => {
    expect(() =>
      defineTrackModule({
        type: "bad-default",
        defaults: {
          display: "dense" as never,
        },
        configSchema: z.object({}),
        fetch: async () => null,
        render: {
          full: FullRenderer,
        },
      }),
    ).toThrow(/Default display "dense" is not supported/);
  });

  it("supports built-in module config creation", () => {
    expect(
      bigWigModule.create({
        id: "signal",
        title: "Signal",
        url: "YOUR_URL_HERE",
      }),
    ).toMatchObject({
      id: "signal",
      type: "bigwig",
      title: "Signal",
      display: "full",
      height: 80,
      color: "#2266aa",
      url: "YOUR_URL_HERE",
    });

    expect(
      bigBedModule.create({
        id: "annotation",
        title: "Annotation",
        url: "YOUR_URL_HERE",
      }),
    ).toMatchObject({ type: "bigbed", display: "dense", height: 60 });

    expect(
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        assembly: "GRCh38",
        version: 1,
      }),
    ).toMatchObject({ type: "transcript", display: "squish", height: 90 });

    expect(bigWigModule.settingsComponent).toBeDefined();
    expect(bigBedModule.settingsComponent).toBeDefined();
    expect(transcriptModule.settingsComponent).toBeDefined();
    expect(bulkBedModule.settingsComponent).toBeDefined();
  });

  it("rejects schema on built-in BigBed configs", () => {
    expect(() =>
      bigBedModule.create({
        id: "annotation",
        title: "Annotation",
        url: "YOUR_URL_HERE",
        schema: { chrom: "string" } as never,
      }),
    ).toThrow(/bigbed config is invalid/);
  });

  it("types interaction items with an explicit module generic", () => {
    const peakSchema = z.object({
      chrom: z.string(),
      start: z.number(),
      end: z.number(),
      signalValue: z.number(),
    });
    type PeakRow = InferBigBedRow<typeof peakSchema>;

    const peaksModule = defineTrackModule<PeakRow>()({
      type: "peaks",
      configSchema: z.object({
        url: z.string().min(1),
      }),
      fetch: async () => [],
      render: {
        dense: DenseRenderer,
      },
      tooltipComponent: ({ item }) => {
        item.signalValue.toFixed(2);
        return null;
      },
    });

    peaksModule.create({
      id: "peaks",
      title: "Peaks",
      url: "YOUR_URL_HERE",
      onClick: ({ item }) => {
        item.signalValue.toFixed(2);
      },
    });
  });
});
