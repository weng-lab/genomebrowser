# Tracks and Track Modules

`Tracks` are rendered rows of genomic data in the browser. Some common ones include BigWig which displays a signal, BigBed which displays rectangles at regions of interest, and Transcripts which displays genes and transcripts.

`Track Modules` define the behavior for a track type. They are a key part of v2 because the browser is mostly orchestration: it coordinates state, viewport behavior, data loading, and rendering, while each track module owns the track-specific details.

## Track instances

Track instances live in the track store. Runtime state is split by ownership:

```ts
type TrackInstance<Config, InteractionItem = unknown> = {
  type: string;
  base: TrackBase;
  config: Config;
  interaction?: TrackInteraction<InteractionItem>;
};

type TrackBase = {
  id: string;
  title: string;
  display: string;
  height: number;
  color?: string;
};
```

`base` is browser-owned state shared by every track. `config` contains only fields defined by the module's `configSchema`. `interaction` contains optional per-instance callbacks. See [Track interactions](#track-interactions).

The `type` field connects a track instance to a registered track module. `base.display` selects one of that module's renderers.

Module `create` accepts nested public input with browser-owned base fields at the top level and module-owned fields under `config`. Optional interaction callbacks are passed as a second argument and are not part of the JSON contract.

## Track modules

A track module defines one track type:

```ts
type TrackModule<
  Type extends string,
  ConfigSchema extends z.ZodObject,
  Data,
  Item = unknown,
> = {
  type: Type;
  configSchema: ConfigSchema;
  createInputSchema: TrackCreateInputSchema<ConfigSchema>;
  create(
    input: TrackCreateInput<z.input<ConfigSchema>>,
    interaction?: TrackInteraction<Item>,
  ): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  validate(instance: unknown): TrackInstance<z.output<ConfigSchema>, Item> & { type: Type };
  fetch(ctx: TrackFetchContext<z.output<ConfigSchema>>): Promise<Data>;
  render: Record<string, ComponentType<TrackRendererProps<z.output<ConfigSchema>, Data>>>;
  settingsComponent?: ComponentType<TrackSettingsProps<z.output<ConfigSchema>>>;
  tooltipComponent?: ComponentType<{ item: Item; config: z.output<ConfigSchema> }>;
};
```

The main responsibilities are:

- `create` builds a nested track instance from nested public input and optional code-only interactions
- `validate` checks an existing nested track instance before use
- `fetch` loads raw data for the requested genomic region using module config
- `render` maps display modes to React renderers
- `settingsComponent` can provide optional module-specific track settings UI
- `tooltipComponent` can provide optional module-specific tooltip UI

Track modules should be defined with `defineTrackModule`. Custom track authors provide `configSchema`, a Zod object for the module-specific config fields. The helper derives `createInputSchema`, validates nested create input, applies defaults, and creates `create` and `validate` functions. See [Schema validation](validation.md) for the config schema convention and [Useful helpers for track modules](helpers.md) for exported hooks that can support custom renderers.

`settingsComponent` is only the module-specific settings child. The browser owns the main settings modal and base settings fields such as title, color, height, and display. Consumers can replace the main modal shell or base settings UI through the browser settings store without changing track modules.

In the implementation, `src/modules` is the shared module system and authoring surface, `src/tracks` contains first-party modules built against that surface, and `src/browser` consumes registered modules through their common contract. First-party and custom tracks should import module contracts from `src/modules` and only use browser-backed behavior through narrow browser feature APIs such as tooltip and auto-height hooks.

Example module shape:

```ts
import { z } from "zod";
import { defineTrackModule } from "@weng-lab/genomebrowser-v2";

type ExampleItem = { id: string; label: string };

export const exampleTrackModule = defineTrackModule<ExampleItem>()({
  type: "example",
  defaults: {
    height: 80,
    color: "#2266aa",
  },
  configSchema: z.object({
    url: z.string().min(1),
  }),
  fetch: fetchExample,
  render: {
    full: FullExample,
    dense: DenseExample,
  },
  tooltipComponent: ExampleTooltip,
  settingsComponent: ExampleSettings,
});
```

Display modes come from the `render` keys. If `defaults.display` is omitted, the first renderer key is used.

`render` must contain at least one renderer. `defaults` is optional; if `height` is omitted it defaults to `80`, and `color` remains optional unless a default color is provided.

## Modules outside the browser

Track modules should stay dumb and browser-independent. A module should describe how to create, validate, fetch, and render one track type, but it should not depend on `GenomeBrowser` internals.

This lets modules be used outside the browser orchestration layer. For example, maintainers can use a module directly to create a config, validate a saved config, fetch data for a region, or render a track in a different shell.

Browser-level interactions such as panning are owned by the browser track wrapper, not by module renderers. Renderers should not add pan-drag pass-through layers; they can keep track-specific hover or click hit areas, and browser panning will work through the wrapper around the rendered SVG content.

Some module-author helpers, such as tooltip and auto-height hooks, are browser-backed feature APIs. Those helpers are intended for modules rendered by `GenomeBrowser`; a custom shell would need to provide equivalent feature providers if it wants those browser-backed behaviors.

Small BigWig example:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-v2";

const track = bigWigModule.create({
  id: "signal",
  title: "Signal",
  config: { url: "YOUR_URL_HERE" },
});
const region = { chromosome: "chr1", start: 1_000_000, end: 1_010_000 };

const data = await bigWigModule.fetch({
  config: track.config,
  region,
});

const BigWig = bigWigModule.render[track.base.display];

return (
  <BigWig
    id={track.base.id}
    config={track.config}
    color={track.base.color}
    data={data}
    region={region}
    width={1000}
    height={50}
  />
);
```

Keep browser behavior in browser hooks and components. Keep module behavior limited to the track type it owns.

## Track interactions

Track instances can include interaction callback fields:

```ts
type TrackInteraction<Item> = {
  onClick?: (item: Item) => void;
  onHover?: (item: Item) => void;
  onLeave?: (item: Item) => void;
};
```

These callbacks are intentionally part of instance state because app callbacks may close over app state for that specific track instance.

Renderers own the timing of these interactions. They call `onClick`, `onHover`, and `onLeave` with the semantic item under the pointer through `useInteraction`, and use browser-backed hooks such as `useTooltip` when they need browser-managed UI like tooltip positioning. Tooltip components are module-owned through `tooltipComponent`, not stored on instances.

Pass an interaction item type to `defineTrackModule` when authoring a module with typed interactions:

```tsx
type ExampleItem = { id: string; label: string; score: number };

export const exampleTrackModule = defineTrackModule<ExampleItem>()({
  type: "example",
  configSchema: exampleConfigSchema,
  fetch: fetchExample,
  render: {
    full: FullExample,
  },
  tooltipComponent: ({ item }) => <text>{item.label}</text>,
});
```

The generic is the semantic object shape the renderer exposes to users. It types `onClick`, `onHover`, `onLeave`, and `tooltipComponent` props. The renderer should pass objects with this shape when it calls interaction callbacks or `tooltip.show(item, event)`. This type does not have to be the raw fetched data type; it should describe the processed item users interact with.

If a renderer can expose multiple item shapes, use a discriminated union:

```ts
type ExampleItem =
  | { kind: "peak"; name: string; signalValue: number }
  | { kind: "motif"; motifId: string; score: number }
  | { kind: "annotation"; label: string; start: number; end: number };

export const exampleTrackModule = defineTrackModule<ExampleItem>()({
  // ...
});
```

Callbacks and tooltips can then narrow on `item.kind`.

```tsx
const track = bigBedModule.create(
  {
    id: "peaks",
    title: "Peaks",
    config: { url: "YOUR_URL_HERE" },
  },
  {
    onClick: (item) => {
      console.log(item.start, item.end);
    },
  },
);
```

Tooltip components are defined by modules with `tooltipComponent`.

Because callbacks are functions, track instances that include interactions are not fully JSON-serializable.

## Built-in tracks

v2 exports these first-party track modules:

- [BigWig](tracks/bigwig.md)
- [BigBed](tracks/bigbed.md)
- [BulkBed](tracks/bulkbed.md)
- [Transcript](tracks/transcript.md)
- [MethylC](tracks/methylc.md)

Use the per-track docs for config fields, display modes, defaults, and fetch behavior.

## BigBed-derived modules

The built-in BigBed module is a generic interval track. When a BigBed file has schema-specific columns that should appear in typed interactions or tooltips, define a distinct module type and reuse the BigBed fetch helper/renderers instead of making the base `bigbed` config carry that behavior.

```tsx
import { z } from "zod";
import {
  DenseBigBed,
  defineTrackModule,
  fetchBigBedRows,
  fetchOnChange,
  SquishBigBed,
  type InferBigBedRow,
} from "@weng-lab/genomebrowser-v2";

const peaksSchema = z.object({
  chrom: z.string(),
  start: z.coerce.number(),
  end: z.coerce.number(),
  name: z.string(),
  score: z.coerce.number(),
  strand: z.string(),
  signalValue: z.coerce.number(),
  pValue: z.coerce.number(),
  qValue: z.coerce.number(),
  peak: z.coerce.number(),
});

type PeakRow = InferBigBedRow<typeof peaksSchema>;

function PeakTooltip({ item }: { item: PeakRow }) {
  return (
    <g>
      <rect width={180} height={28} fill="#ffffff" stroke="#cccccc" />
      <text x={8} y={18} fill="#000000" fontSize={12}>
        {item.name}: {item.signalValue}
      </text>
    </g>
  );
}

export const peaksModule = defineTrackModule<PeakRow>()({
  type: "peaks",
  defaults: {
    height: 60,
    color: "#4b9560",
  },
  configSchema: z.object({
    url: fetchOnChange(z.string().min(1)),
  }),
  fetch: ({ config, region }) =>
    fetchBigBedRows({
      url: config.url,
      region,
      schema: peaksSchema,
    }),
  render: {
    dense: DenseBigBed,
    squish: SquishBigBed,
  },
  tooltipComponent: PeakTooltip,
});
```

Schema key order is the column mapping order. For example, the fourth key maps to the first field after `chrom`, `start`, and `end`. Use `z.coerce.number()` for numeric fields because BigBed extra fields may be read as strings. If a file uses `chromStart` and `chromEnd` field names, the BigBed parser normalizes those aliases to `start` and `end` for rendering.

Use a unique module `type` for each schema-specific BigBed module. Once the schema determines the interaction item shape, it is part of the module's behavior alongside its tooltip component and fetch function. If the renderer exposes parsed BigBed rows directly, `InferBigBedRow<typeof schema>` is a good interaction item type. If the renderer wraps or transforms rows, use the transformed object type instead.

## Runtime flow

At runtime, the browser uses modules through the registry:

1. `GenomeBrowser` receives a `modules` array.
2. `createModuleRegistry([moduleA, moduleB])` indexes modules by `type` while preserving the module tuple in its type.
3. Track instances come from the track store.
4. Data loading calls `registry.get(track.type)`, which returns the exact registered module type for literal module tuples.
5. The module validates the track instance and fetches data with `track.config` for the current render region.
6. Rendering finds the module again and chooses `module.render[track.base.display]`.

This keeps the browser generic. Adding or changing a track type should mostly mean changing that track's module, not the browser orchestration layer.

For JSON catalogs, `createTrackFromEntry(registry, entry)` is the JSON-to-typed-track boundary. A catalog entry uses the same nested create input shape plus a `type` discriminator and optional `metadata`:

```json
{
  "type": "bigwig",
  "id": "signal",
  "title": "Signal",
  "height": 80,
  "config": { "url": "YOUR_URL_HERE" },
  "metadata": { "assay": "signal" }
}
```
