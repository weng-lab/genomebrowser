import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTrackModule } from "../../src/modules/defineTrackModule";
import { bigWigModule } from "../../src/tracks/bigwig/module";
import type { TrackRendererProps } from "../../src/modules/types";

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

  it("creates nested track instances from public input", () => {
    expect(
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }),
    ).toEqual({
      type: "example",
      base: {
        id: "signal",
        title: "Signal",
        display: "full",
        height: 80,
        color: "#2266aa",
      },
      config: {
        url: "YOUR_URL_HERE",
        enabled: true,
      },
    });
  });

  it("types create input from required and defaulted config schema fields", () => {
    module.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });

    if (false) {
      module.create({
        id: "signal",
        title: "Signal",
        // @ts-expect-error url is required by the config schema.
        config: {},
      });
    }
  });

  it("validates full nested runtime instances", () => {
    const track = module.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });

    expect(module.validate(track)).toEqual(track);
    expect(() => module.validate({ ...track, type: "other" })).toThrow(
      /example instance is invalid/,
    );
    expect(() => module.validate({ ...track, url: "OTHER_URL" })).toThrow(
      /example instance is invalid/,
    );
  });

  it("returns create output that passes validate", () => {
    const track = module.create({
      id: "signal",
      title: "Signal",
      config: { url: "YOUR_URL_HERE" },
    });

    expect(module.validate(track)).toEqual(track);
  });

  it("rejects invalid module-authored defaults at module definition time", () => {
    expect(() =>
      defineTrackModule({
        type: "bad-default-height",
        defaults: {
          height: -1,
        },
        configSchema: z.object({}),
        fetch: async () => null,
        render: { full: FullRenderer },
      }),
    ).toThrow(/bad-default-height defaults is invalid/);
  });

  it("preserves optional module-owned components", () => {
    expect(module.settingsComponent).toBe(SettingsComponent);
    expect(module.tooltipComponent).toBe(TooltipComponent);
  });

  it("rejects invalid display modes", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
        display: "expanded" as never,
      }),
    ).toThrow(/example input is invalid/);
  });

  it("rejects unknown input keys", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
        typo: true,
      } as never),
    ).toThrow(/example input is invalid/);
  });

  it("preserves custom config schema refinements", () => {
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
        config: { min: 10, max: 5 },
      }),
    ).toThrow(/min must be less than max/);
  });

  it("applies Zod config defaults without dropping object refinements", () => {
    const rangeModule = defineTrackModule({
      type: "defaulted-range",
      configSchema: z
        .object({
          min: z.number().default(0),
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

    expect(
      rangeModule.create({
        id: "range",
        title: "Range",
        config: { max: 10 },
      }).config,
    ).toEqual({ min: 0, max: 10 });
    expect(() =>
      rangeModule.create({
        id: "range",
        title: "Range",
        config: { max: -1 },
      }),
    ).toThrow(/min must be less than max/);
  });

  it("stores runtime-aware interaction callbacks separately from config", () => {
    const onClick = () => undefined;
    const onHover = () => undefined;
    const onLeave = () => undefined;
    const track = module.create(
      {
        id: "interactive",
        title: "Interactive",
        config: { url: "YOUR_URL_HERE" },
      },
      { onClick, onHover, onLeave },
    );

    expect(track.interaction).toEqual({ onClick, onHover, onLeave });
    expect(track.config).not.toHaveProperty("onClick");
  });

  it("rejects invalid interaction field values", () => {
    expect(() =>
      module.create(
        {
          id: "signal",
          title: "Signal",
          config: { url: "YOUR_URL_HERE" },
        },
        { onClick: "not a function" as never },
      ),
    ).toThrow(/example interaction is invalid/);
  });

  it("rejects invalid falsy interaction values", () => {
    expect(() =>
      module.create(
        {
          id: "signal",
          title: "Signal",
          config: { url: "YOUR_URL_HERE" },
        },
        null as never,
      ),
    ).toThrow(/example interaction is invalid/);
  });

  it("applies Zod config defaults through the create input schema", () => {
    const defaultedModule = defineTrackModule({
      type: "defaulted",
      configSchema: z.object({
        url: z.string().min(1).default("YOUR_URL_HERE"),
        assembly: z.string().min(1),
        enabled: z.boolean().default(true),
      }),
      fetch: async () => null,
      render: { full: FullRenderer },
    });

    expect(
      defaultedModule.create({
        id: "signal",
        title: "Signal",
        config: { assembly: "hg38" },
      }).config,
    ).toEqual({ url: "YOUR_URL_HERE", assembly: "hg38", enabled: true });
    expect(() =>
      defaultedModule.create({
        id: "signal",
        title: "Signal",
        config: {},
      } as never),
    ).toThrow(/defaulted input is invalid/);

    const schema = z.toJSONSchema(defaultedModule.createInputSchema, { io: "input" }) as {
      properties?: {
        config?: { required?: string[] };
      };
    };
    const required = schema.properties?.config?.required;
    expect(required).toContain("assembly");
    expect(required).not.toContain("url");
  });

  it("rejects missing or non-object config input", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
      } as never),
    ).toThrow(/example input is invalid/);

    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        config: null,
      } as never),
    ).toThrow(/example input is invalid/);
  });

  it("emits display options into JSON schema", () => {
    expect(z.toJSONSchema(module.createInputSchema, { io: "input" })).toMatchObject({
      properties: {
        display: {
          enum: ["full", "dense"],
        },
      },
    });
  });

  it("rejects tooltip on create input", () => {
    expect(() =>
      module.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
        tooltip: TooltipComponent,
      } as never),
    ).toThrow(/example input is invalid/);
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
    ).toThrow(/default display "dense" is not supported/);
  });

  it("supports built-in module instance creation", () => {
    expect(
      bigWigModule.create({
        id: "signal",
        title: "Signal",
        config: { url: "YOUR_URL_HERE" },
      }),
    ).toMatchObject({
      type: "bigwig",
      base: {
        id: "signal",
        title: "Signal",
        display: "full",
        height: 80,
        color: "#2266aa",
      },
      config: {
        url: "YOUR_URL_HERE",
      },
    });
  });

  it("types renderer props with module config only", () => {
    type ExampleConfig = { url: string; enabled: boolean };
    const Renderer = (props: TrackRendererProps<ExampleConfig, null>) => {
      props.config.url satisfies string;
      props.id satisfies string;
      return null;
    };

    defineTrackModule({
      type: "renderer-types",
      configSchema: z.object({ url: z.string(), enabled: z.boolean() }),
      fetch: async () => null,
      render: { full: Renderer },
    });
  });

  it("types interaction items with an explicit module generic", () => {
    type PeakRow = { start: number; end: number; signalValue: number };

    const peaksModule = defineTrackModule<PeakRow>()({
      type: "peaks",
      configSchema: z.object({
        url: z.string().min(1),
      }),
      fetch: async () => [],
      render: {
        dense: DenseRenderer,
      },
      tooltipComponent: ({ item, context }) => {
        item.signalValue.toFixed(2);
        context.config.url.toUpperCase();
        return null;
      },
    });

    peaksModule.create(
      {
        id: "peaks",
        title: "Peaks",
        config: { url: "YOUR_URL_HERE" },
      },
      {
        onClick: (item, context) => {
          item.signalValue.toFixed(2);
          context.config.url.toUpperCase();
        },
      },
    );
  });
});
