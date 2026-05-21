# Tracks and Track Modules

Track modules define the behavior for a track type. They are a key part of v2 because the browser is mostly orchestration: it coordinates state, viewport behavior, data loading, and rendering, while each track module owns the track-specific details.

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

The `type` field connects a track config to a registered track module. The `display` field selects one of that module's renderers.

## Track modules

A track module defines one track type:

```ts
type TrackModule<Config, Data> = {
  type: Config["type"];
  create(input: unknown): Config;
  validate(config: unknown): Config;
  fetch(ctx: TrackFetchContext<Config>): Promise<Data>;
  render: Record<string, ComponentType<TrackRendererProps<Config, Data>>>;
  settings?: ComponentType<TrackSettingsProps<Config>>;
};
```

The main responsibilities are:

- `create` builds a runtime track config from public input
- `validate` checks an existing runtime config before use
- `fetch` loads data for the current render region and width
- `render` maps display modes to React renderers
- `settings` can provide optional track settings UI

Track modules should keep their own Zod schemas near the module. Use `create` to parse public input and apply defaults, then use `validate` to check runtime configs before fetching or rendering. See [Schema validation](validation.md) for the shared validation helpers and conventions.

## Modules outside the browser

Track modules should stay dumb and browser-independent. A module should describe how to create, validate, fetch, and render one track type, but it should not depend on `GenomeBrowser` internals.

This lets modules be used outside the browser orchestration layer. For example, maintainers can use a module directly to create a config, validate a saved config, fetch data for a region, or render a track in a different shell.

Small BigWig example:

```ts
import { bigWig, bigWigModule } from "../src";

const track = bigWig({
  id: "signal",
  title: "Signal",
  url: "YOUR_URL_HERE",
});

const validatedTrack = bigWigModule.validate(track);
const data = await bigWigModule.fetch({
  track: validatedTrack,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_010_000 },
  width: 800,
});

const Renderer = bigWigModule.render[validatedTrack.display];
```

Keep browser behavior in browser hooks and components. Keep module behavior limited to the track type it owns.

## Runtime flow

At runtime, the browser uses modules through the registry:

1. `GenomeBrowser` receives a `modules` array.
2. The module registry indexes modules by `type`.
3. Track configs come from the track store.
4. Data loading finds the module for each track's `type`.
5. The module validates the track config and fetches data for the current render region.
6. Rendering finds the module again and chooses `module.render[track.display]`.

This keeps the browser generic. Adding or changing a track type should mostly mean changing that track's module, not the browser orchestration layer.
