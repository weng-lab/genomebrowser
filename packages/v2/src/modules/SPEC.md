# Track Module Spec

Track modules are the main authoring seam for v2 track types. A module author provides a `type`, one Zod schema for module-owned `config`, a fetch function, renderers, and optional module-owned UI. The browser stores a validated `TrackInstance` split by ownership, while `create` keeps a flat ergonomic input for users.

## Runtime Shape

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

type TrackInteraction<Item = unknown> = {
  onClick?: (item: Item) => void;
  onHover?: (item: Item) => void;
  onLeave?: (item: Item) => void;
};
```

- `type` selects the registered module.
- `base` is browser-owned state shared by every track: `id`, `title`, `display`, `height`, and `color`.
- `config` contains only fields from the module's `configSchema`.
- `interaction` contains optional per-instance callbacks. Callbacks receive the semantic item emitted by the renderer.
- Tooltip components are module-owned through `tooltipComponent`, not stored on track instances.

## Module Authoring

```ts
export const exampleModule = defineTrackModule<ExampleItem>()({
  type: "example",
  defaults: {
    display: "full",
    height: 80,
    color: "#2266aa",
    config: {
      colorBy: "score",
    },
  },
  configSchema: z.object({
    url: fetchOnChange(z.string().min(1)),
    colorBy: z.string().default("score"),
  }),
  fetch: fetchExample,
  render: {
    full: FullExample,
    dense: DenseExample,
  },
  settingsComponent: ExampleSettings,
  tooltipComponent: ExampleTooltip,
});
```

- `configSchema` defines only module-owned config fields.
- `render` keys define supported display modes.
- `defaults.display` defaults to the first render key when omitted.
- `defaults.height` defaults to `80` when omitted.
- `defaults.color` is optional; without it, `base.color` remains optional.
- `defaults.config` can provide module config defaults before schema parsing.

Reserved config schema fields are `id`, `type`, `title`, `display`, `height`, `color`, `base`, `config`, `interaction`, `onClick`, `onHover`, `onLeave`, and `tooltip`.

## Create Input

`create` accepts flat public input and returns a nested `TrackInstance`.

```ts
const track = exampleModule.create({
  id: "signal",
  title: "Signal",
  url: "YOUR_URL_HERE",
  color: "#2266aa",
  onClick: (item) => {
    console.log(item);
  },
});
```

The module system partitions the flat input into `base`, `config`, and `interaction`. Unknown fields fail validation.

## Validation

`validate` accepts only the full nested runtime shape. Old flat configs are invalid. Track stores should validate through registered modules before accepting initial tracks or updates.

## Fetching

Fetchers receive only module config and region:

```ts
type TrackFetch<Config, Data> = (context: {
  config: Config;
  region: BrowserRegion;
}) => Promise<Data>;
```

Fetchers return raw region data. Empty data should use the data type's zero value; failures should throw.

`fetchOnChange` marks config schema fields that affect fetched data. Fetch signatures are built from `track.config`, not browser-owned base or interaction state.

## Rendering

Renderers receive only the data they naturally need:

```ts
type TrackRendererProps<Config, Data> = {
  id: string;
  config: Config;
  color?: string;
  data: Data;
  region: BrowserRegion;
  width: number;
  height: number;
};
```

Renderers can read instance callbacks with `useInteraction<Item>()`. Browser-owned rendering should wrap module renderers with `TrackInteractionProvider`.

## Settings

Module settings receive module config only:

```ts
type TrackSettingsProps<Config> = {
  id: string;
  config: Config;
  updateConfig: (partial: Partial<Config>) => TrackMutationResult;
};
```

The browser owns base settings such as title, display, color, and height.

## Public Surface

The intended public module surface is `defineTrackModule`, `fetchOnChange`, `useInteraction`, `TrackInteractionProvider`, and the exported module types from `types.ts`.
