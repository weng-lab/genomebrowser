import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bigBedModule } from "../../src/tracks/bigbed/module";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import { transcriptModule } from "../../src/tracks/transcript/module";

describe("defineTrackModule", () => {
  function FullRenderer() {
    return null;
  }

  function DenseRenderer() {
    return null;
  }

  const module = defineTrackModule({
    type: "example",
    defaults: {
      height: 80,
      color: "#2266aa",
    },
    schema: z.object({
      url: z.string().min(1),
      enabled: z.boolean().default(true),
    }),
    fetch: async () => null,
    render: {
      full: FullRenderer,
      dense: DenseRenderer,
    },
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

  it("preserves top-level custom schema refinements", () => {
    const rangeModule = defineTrackModule({
      type: "range",
      schema: z
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

  it("rejects reserved custom schema fields", () => {
    expect(() =>
      defineTrackModule({
        type: "reserved",
        schema: z.object({
          display: z.string(),
        }),
        fetch: async () => null,
        render: {
          full: FullRenderer,
        },
      }),
    ).toThrow(/cannot define reserved field "display"/);
  });

  it("rejects empty render maps", () => {
    expect(() =>
      defineTrackModule({
        type: "empty",
        schema: z.object({}),
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
        schema: z.object({}),
        fetch: async () => null,
        render: {
          full: FullRenderer,
        },
      }),
    ).toThrow(/Default display "dense" is not supported/);
  });

  it("supports built-in module config creation", () => {
    const bigBedSchema = z.object({
      chrom: z.string(),
      start: z.number(),
      end: z.number(),
      name: z.string().optional(),
    });

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
        schema: bigBedSchema,
      }),
    ).toMatchObject({ type: "bigbed", display: "dense", height: 60, schema: bigBedSchema });

    expect(
      transcriptModule.create({
        id: "genes",
        title: "Genes",
        assembly: "GRCh38",
        version: 1,
      }),
    ).toMatchObject({ type: "transcript", display: "squish", height: 90 });
  });

  it("rejects invalid BigBed schemas", () => {
    expect(() =>
      bigBedModule.create({
        id: "annotation",
        title: "Annotation",
        url: "YOUR_URL_HERE",
        schema: { chrom: "string" } as never,
      }),
    ).toThrow(/bigbed config is invalid/);
  });
});
