# Tracks and Track Modules

A track is one validated, ordered row in a browser. A track module defines the stable behavior for one track type. This division keeps `GenomeBrowser` generic and makes first-party and downstream tracks use the same extension boundary.

## Ownership model

A runtime track has four parts:

```ts
type TrackInstance<Config, Item = unknown> = {
  type: string;
  base: {
    id: string;
    title: string;
    display: string;
    height: number;
    color?: string;
  };
  config: Config;
  interaction?: TrackInteraction<Item>;
};
```

- `type` resolves the registered module.
- `base` is browser-owned per-instance state. `display` selects a key from the module's renderer map.
- `config` is module-owned per-instance state parsed by the module's Zod schema.
- `interaction` contains optional `onClick`, `onHover`, and `onLeave` app callbacks.

The module owns the config schema, creation and validation, fetch function, renderer map, defaults, and optional settings and tooltip components. Components and stable type behavior do not belong in track instances. Interactions make an instance code-bearing and therefore not fully JSON-serializable.

## Defining a module

Use `defineTrackModule` rather than constructing the contract by hand:

```tsx
import { z } from "zod";
import {
  defineTrackModule,
  fetchOnChange,
  type TrackRendererProps,
} from "@weng-lab/genomebrowser-v2";

const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  threshold: z.number().default(0),
});

type Config = z.infer<typeof configSchema>;
type Data = Array<{ start: number; end: number; value: number }>;

function FullTrack(props: TrackRendererProps<Config, Data>) {
  return <g>{/* Render raw regional data for props.region and props.width. */}</g>;
}

export const exampleModule = defineTrackModule({
  type: "example",
  defaults: { height: 80, color: "#2266aa" },
  configSchema,
  async fetch({ config, region }): Promise<Data> {
    // Fetch and return raw data for config.url and region.
    return [];
  },
  render: { full: FullTrack },
});
```

`defineTrackModule` makes the config schema strict, derives the full create-input and instance schemas, and supplies `create` and `validate`. Zod config defaults belong in `configSchema`. Browser-owned defaults belong in `defaults`: `height` falls back to `80`, `color` remains optional, and `display` falls back to the first renderer key. At least one renderer is required, and an explicit default display must name one of them.

Module fetch functions receive only `{ config, region }` and return raw regional data. Renderers receive that data plus config, dimensions, region, ID, and color; they own display- and pixel-specific transformations. The browser owns loading and error presentation, panning, track controls, and renderer selection.

## Requests and config changes

The browser requests every track on initial load and whenever the active render region changes. For config-only changes, it compares a signature made from fields wrapped in `fetchOnChange`:

```ts
const configSchema = z.object({
  url: fetchOnChange(z.string().min(1)),
  colorScale: z.string().default("linear"),
});
```

Changing `url` requests new data. Changing `colorScale` re-renders with the current data. Mark nested URL, dataset, assembly, version, or query fields that affect the response; do not mark visual-only options. Omitting `fetchOnChange` from a data-source field is a common cause of stale data after settings changes.

## Display, settings, and interaction

Renderer-map keys are the module's allowed display values. The browser validates `base.display`, chooses the renderer, and supplies browser-level controls. A module's `settingsComponent` receives `{ id, config, updateConfig }`; it should use `updateConfig` and handle its mutation result. The browser separately owns base settings such as title, display, height, and color.

A renderer decides when a semantic interaction happens. It can read callbacks with `useInteraction<Item>()` and use `useTooltip` for browser-positioned module tooltips. The module's item generic describes the semantic object exposed to callbacks and the tooltip, not necessarily its raw fetch row.

## Registry and catalog boundaries

`createTrackStore({ modules, tracks })` creates the registry and validates initial instances. At runtime, fetching, rendering, settings, and tooltips all resolve the module by `track.type`. Module types and track IDs must be unique.

A catalog entry is create input, not a runtime instance:

```json
{
  "type": "bigwig",
  "id": "signal",
  "title": "Signal",
  "config": { "url": "YOUR_URL_HERE" },
  "metadata": { "assay": "signal" }
}
```

`createTrackFromEntry(registry, entry)` removes catalog-only `type` and `metadata`, then delegates to the selected module's `create`. The result has the nested runtime shape and applied defaults. Keep this boundary explicit when loading JSON.

## Stable extension seams

The recommended module-author surface is the package root: `defineTrackModule`, `fetchOnChange`, module contract types, `useInteraction`, `useTooltip`, `useAutoTrackHeight`, and `SettingsSection`. Use store APIs only when the focused renderer or settings props are insufficient. Do not import files under `src/` from downstream modules.

The built-in BigBed implementation should currently be treated as a first-party track, not as the documented base for derived modules. Typed BigBed specialization and renderer reuse remain deferred until that support is finalized.

## Built-in tracks

Current first-party modules are summarized in [Built-in track modules](tracks/README.md). Keep that inventory implementation-backed and avoid promising unstable per-track extension behavior.
