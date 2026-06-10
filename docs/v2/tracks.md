# Tracks and Track Modules

`Tracks` are rendered rows of genomic data in the browser. Some common ones include BigWig which displays a signal, BigBed which displays rectangles at regions of interest, and Transcripts which displays genes and transcripts.

`Track Modules` define the behavior for a track type. They are a key part of v2 because the browser is mostly orchestration: it coordinates state, viewport behavior, data loading, and rendering, while each track module owns the track-specific details.

## Track configs

Track configs live in the track store. Every track config shares a small base shape:

```ts
type TrackConfigBase = {
  id: string;
  type: string;
  title: string;
  display: string;
  height: number;
  color?: string;
};
```

Track configs are the **runtime** configuration objects that define behavior such as color, title, and any other custom fields that a module has defined for its config. They tell the browser _how_ to render the track.

The `type` field connects a track config to a registered track module. The `display` field selects one of that module's renderers.

## Track modules

A track module defines one track type:

```ts
type TrackModule<Config, Data, Input = unknown> = {
  type: Config["type"];
  create(input: Input): Config;
  validate(config: unknown): Config;
  fetch(ctx: TrackFetchContext<Config>): Promise<Data>;
  render: Record<string, ComponentType<TrackRendererProps<Config, Data>>>;
  settingsComponent?: ComponentType<TrackSettingsProps<Config>>;
};
```

The main responsibilities are:

- `create` builds a track config from public input
- `validate` checks an existing track config before use
- `fetch` loads raw data for the requested genomic region using the track config
- `render` maps display modes to React renderers
- `settingsComponent` can provide optional module-specific track settings UI

Track modules should be defined with `defineTrackModule`. Custom track authors provide one Zod schema for the track's config, and the helper creates the module's base config schema, `create`, and `validate` functions. See [Schema validation](validation.md) for the schema convention and [Useful helpers for track modules](helpers.md) for exported hooks that can support custom renderers.

`settingsComponent` is only the module-specific settings child. The browser owns the main settings modal and base settings fields such as title, color, height, and display. Consumers can replace the main modal shell or base settings UI through the browser settings store without changing track modules.

Example module shape:

```ts
import { z } from "zod";
import { defineTrackModule } from "@weng-lab/genomebrowser-v2";

export const exampleTrackModule = defineTrackModule({
  type: "example",
  defaults: {
    height: 80,
    color: "#2266aa",
  },
  schema: z.object({
    url: z.string().min(1),
  }),
  fetch: fetchExample,
  render: {
    full: FullExample,
    dense: DenseExample,
  },
  settingsComponent: ExampleSettings,
});
```

The custom schema must not define reserved base fields: `id`, `type`, `title`, `display`, `height`, or `color`. Display modes come from the `render` keys. If `defaults.display` is omitted, the first renderer key is used.

`render` must contain at least one renderer. `defaults` is optional; if `height` is omitted it defaults to `80`, and `color` remains optional unless a default color is provided.

## Modules outside the browser

Track modules should stay dumb and browser-independent. A module should describe how to create, validate, fetch, and render one track type, but it should not depend on `GenomeBrowser` internals.

This lets modules be used outside the browser orchestration layer. For example, maintainers can use a module directly to create a config, validate a saved config, fetch data for a region, or render a track in a different shell.

Small BigWig example:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-v2";

const track = bigWigModule.create({
  id: "signal",
  title: "Signal",
  url: "YOUR_URL_HERE",
});
const region = { chromosome: "chr1", start: 1_000_000, end: 1_010_000 };

const data = await bigWigModule.fetch({
  config: track,
  region,
});

const BigWig = bigWigModule.render[track.display];

return (
  <BigWig config={track} data={data} region={region} width={1000} height={50} />
);
```

Keep browser behavior in browser hooks and components. Keep module behavior limited to the track type it owns.

## Track interactions

Track configs can include interaction fields:

```ts
type TrackInteractionConfig<Item, Config> = {
  onClick?: (context: { item: Item; config: Config; event: React.MouseEvent }) => void;
  onHover?: (context: { item: Item; config: Config; event: React.MouseEvent }) => void;
  onLeave?: (context: { item: Item; config: Config; event: React.MouseEvent }) => void;
  tooltip?: React.ComponentType<{ item: Item; config: Config }>;
};
```

These fields are intentionally part of config state because v2 treats generated track configs as the **runtime** unit inserted into the track store. This keeps programmatic track creation simple: build the config, attach callbacks or a tooltip, and add it to the store.

```tsx
const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  url: "YOUR_URL_HERE",
  onClick: ({ item, config, event }) => {
    console.log(config.id, item.start, item.end, event.clientX);
  },
  tooltip: ({ item, config }) => (
    <g>
      <text>{`${config.title}: ${item.name ?? `${item.start}-${item.end}`}`}</text>
    </g>
  ),
});
```

Module defaults can also include interaction fields. This is useful for semantic wrapper modules that reuse generic behavior but want a default tooltip or callback policy. A config created from that module can still override the default interaction fields.

Because callbacks and React components are functions, track configs that include interactions are not fully JSON-serializable.

## BigBed row schemas

The built-in BigBed module accepts an optional Zod object schema on the track config. The schema describes the BigBed file columns in file order, including coordinate fields. Fetched rows are parsed with that schema before being stored as track data, so user interactions can receive named, typed fields instead of raw tab-delimited values.

```ts
import { z } from "zod";
import { bigBedModule, type InferBigBedRow } from "@weng-lab/genomebrowser-v2";

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

const track = bigBedModule.create({
  id: "peaks",
  title: "Peaks",
  url: "YOUR_URL_HERE",
  schema: peaksSchema,
});
```

Schema key order is the column mapping order. For example, the fourth key maps to the first field after `chrom`, `start`, and `end`. Use `z.coerce.number()` for numeric fields because BigBed extra fields may be read as strings. If a file uses `chromStart` and `chromEnd` field names, the BigBed module normalizes those aliases to `start` and `end` for rendering.

Because the schema is a Zod object, BigBed configs that include `schema` contain a runtime object and are not fully JSON-serializable.

## Runtime flow

At runtime, the browser uses modules through the registry:

1. `GenomeBrowser` receives a `modules` array.
2. The module registry indexes modules by `type`.
3. Track configs come from the track store.
4. Data loading finds the module for each track's `type`.
5. The module validates the track config and fetches data for the current render region.
6. Rendering finds the module again and chooses `module.render[track.display]`.

This keeps the browser generic. Adding or changing a track type should mostly mean changing that track's module, not the browser orchestration layer.
