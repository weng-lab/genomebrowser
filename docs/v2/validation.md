# Schema Validation - WIP

v2 uses Zod for runtime validation at package boundaries and before runtime behavior depends on config shape.

The goal is to fail early with useful errors while keeping custom track definitions small.

## Custom track schemas

Custom track authors define one Zod schema for track-specific input fields and pass it to `defineTrackModule`:

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
});
```

The schema should only include custom fields. `defineTrackModule` owns the base fields (`id`, `type`, `title`, `display`, `height`, and `color`), enforces strict object validation, and derives the full runtime config validator from them. Field-level validation, defaults, and object-level refinements on the custom schema are preserved.

Display modes come from the `render` keys, and each module must provide at least one renderer. If `defaults.display` is omitted, the first renderer key is used. The custom schema cannot define reserved base fields.

## What the helper creates

`defineTrackModule` returns a `TrackModule` with generated `create` and `validate` functions:

- `create(input)` parses public input, applies base and custom defaults, and appends the fixed `type`
- `validate(config)` checks a full runtime config and requires the fixed `type`

The optional `defaults` object can provide `display`, `height`, and `color`. If `height` is omitted, it defaults to `80`; if `color` is omitted, color remains optional.

Track configs should be created through the module:

```ts
const track = exampleTrackModule.create({
  id: "signal",
  title: "Signal",
  url: "YOUR_URL_HERE",
});
```

## Where validation happens

Validation is used in a few places:

- browser store input is parsed when the browser store is created
- region input is parsed by the region utilities
- track store input and updates are checked against the base track config shape
- each track module validates its own full config before fetching or rendering through its generated `validate`

## Design direction

Use schemas at boundaries, not everywhere. Once input has been parsed, prefer passing typed values through the browser, hooks, and modules.
