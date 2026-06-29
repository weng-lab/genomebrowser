# Schema Validation - WIP

v2 uses Zod for runtime validation at package boundaries and before runtime behavior depends on config shape.

The goal is to fail early with useful errors while keeping custom track definitions small.

## Custom Track Config Schemas

Custom track authors define `configSchema`, a Zod object for track-specific config/input fields, and pass it to `defineTrackModule`:

```ts
import { z } from "zod";
import { defineTrackModule } from "@weng-lab/genomebrowser-v2";

export const exampleTrackModule = defineTrackModule({
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
});
```

If the module exposes typed interaction items, pass that semantic item type to `defineTrackModule`:

```ts
type ExampleItem = { id: string; label: string };

export const exampleTrackModule = defineTrackModule<ExampleItem>()({
  type: "example",
  configSchema: z.object({
    url: z.string().min(1),
  }),
  fetch: fetchExample,
  render: {
    full: FullExample,
  },
});
```

The config schema should only include custom fields. `defineTrackModule` owns the browser base fields (`id`, `title`, `display`, `height`, and `color`) and interaction callback fields (`onClick`, `onHover`, and `onLeave`), enforces strict object validation, and derives the full nested track instance validator from them. Field-level validation, defaults, and object-level refinements on the custom config schema are preserved.

The interaction item type is separate from the config schema. It describes the object shape the renderer passes to `onClick`, `onHover`, `onLeave`, and tooltips. If a renderer can expose several shapes, use a discriminated union such as `type ExampleItem = PeakItem | MotifItem | AnnotationItem`.

Display modes come from the `render` keys, and each module must provide at least one renderer. If `defaults.display` is omitted, the first renderer key is used. The custom config schema cannot define reserved fields.

Reserved fields are: `id`, `type`, `title`, `display`, `height`, `color`, `base`, `config`, `interaction`, `onClick`, `onHover`, `onLeave`, and `tooltip`.

## What the helper creates

`defineTrackModule` returns a `TrackModule` with generated `create` and `validate` functions:

- `create(input)` parses flat public input, partitions it into `base`, `config`, and `interaction`, applies defaults, and returns the nested runtime instance
- `validate(instance)` checks a full nested track instance and requires the fixed `type`

The optional `defaults` object can provide `display`, `height`, and `color`. If `height` is omitted, it defaults to `80`; if `color` is omitted, color remains optional.

Track configs should be created through the module:

```ts
const track = exampleTrackModule.create({
  id: "signal",
  title: "Signal",
  url: "YOUR_URL_HERE",
});
```

The returned runtime shape is nested:

```ts
{
  type: "example",
  base: { id: "signal", title: "Signal", display: "full", height: 80 },
  config: { url: "YOUR_URL_HERE" },
}
```

## Where validation happens

Validation is used in a few places:

- browser store input is parsed when the browser store is created
- region input is parsed by the region utilities
- track instances are validated through registered modules before entering or changing track state
- browser runtime code trusts track instances from the track store when fetching, rendering, and opening settings
- track mutators return a result object so callers can display validation errors without duplicating validation

## Design direction

Use schemas at boundaries, not everywhere. Once input has been parsed, prefer passing typed values through the browser, hooks, and modules.
