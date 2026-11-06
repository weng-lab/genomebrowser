# State schemas

The browser validates store input and track instances with Zod schemas. Import the same schemas from `@weng-lab/genomebrowser/schemas` to validate saved browser state, build config schemas for track modules, or compose a larger document such as a saved session. This entry point imports only Zod, so server code can use it without loading React.

```ts
import { z } from "zod";
import {
  browserSettingsSchema,
  trackBaseSchema,
  trackSourceSchema,
} from "@weng-lab/genomebrowser/schemas";

const savedViewSchema = z.strictObject({
  browser: browserSettingsSchema.extend({
    assembly: z.string(),
    region: z.object({ chromosome: z.string(), start: z.number(), end: z.number() }),
  }),
  tracks: z.array(
    z.strictObject({
      type: z.string(),
      base: trackBaseSchema,
      config: z.record(z.string(), z.json()),
      source: trackSourceSchema,
    }),
  ),
});
```

The schemas accept the same values as the stores. The TypeScript types for these values come from the main entry point: `Highlight`, `SelectionHighlightStyle`, `BrowserSelectionMode`, and `BasePairDetailSettings` on the [browser store page](../01-browserSetup/browserStore.md), and `TrackBase` and `TrackSource` on the [track instances page](../03-trackDefinition/trackInstances.md).

## API

| Export                     | Validates                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hexColorSchema`           | A six-digit `#RRGGBB` color, in either letter case. Track base colors and first-party track colors use it.                                                                                                                         |
| `trackSourceSchema`        | `"host"` or `"user"`, the [track source](../03-trackDefinition/trackInstances.md).                                                                                                                                                 |
| `trackBaseSchema`          | A strict `TrackBase`: non-empty `id`, `title`, and `display`, a positive `height`, and a `hexColorSchema` `color`. It accepts any non-empty display; a module's own schemas restrict `display` to its renderer keys.               |
| `trackBaseDefaults`        | Not a schema. `{ height: 80, color: "#000000" }`, the base values a track gets when neither its input nor its module `defaults` supply them.                                                                                       |
| `highlightSchema`          | A `Highlight`: non-empty `id`, a region with integer `start` less than `end` and an optional non-empty `chromosome`, a non-empty `color`, an optional `opacity` from 0 to 1, and an optional `type` of `"filled"` or `"outlined"`. |
| `selectionHighlightSchema` | A `SelectionHighlightStyle`: the `color`, `opacity`, and `type` fields of `highlightSchema`.                                                                                                                                       |
| `selectionModeSchema`      | `"pan"`, `"zoom"`, or `"highlight"`.                                                                                                                                                                                               |
| `basePairDetailSchema`     | Strict `BasePairDetailSettings` with a positive integer `maxVisibleBases`.                                                                                                                                                         |
| `browserSettingsSchema`    | Every serializable browser store setting except `assembly` and `region`: `basePairDetail`, `marginWidth`, `trackWidth`, `fontSize`, `titleSize`, `highlights`, `selectionMode`, and `selectionHighlight`, all required.            |

Object schemas other than `trackBaseSchema` and `basePairDetailSchema` remove unknown keys rather than rejecting them, as `createBrowserStore` does. Call `.strict()` on a composed schema to reject unknown keys at its own level.

Return to [Collections and schemas](README.md).
