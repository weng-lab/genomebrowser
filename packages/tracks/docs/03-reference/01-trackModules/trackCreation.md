# Create and validate tracks

Every first-party module has the same creation methods. Import the module from its track subpath and pass the resulting instance to core's track store. Registration makes the type available; it does not create a track.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const track = bigWigModule.create({
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
});
const useTrackStore = createTrackStore({ modules: [bigWigModule], tracks: [track] });
```

Use [firstPartyTrackModules](../02-collectionsAndSchemas/firstPartyTrackModules.md) to register every built-in type. For a complete browser setup, see [Use first-party tracks](../../01-gettingStarted/01-useTracks.md).

## Creation input

`module.create(input, interaction?)` validates input, applies defaults, and returns an instance with the module's `type`. Creation does not fetch data. Each module exports a `CreateInput` type for authored values and a `Config` type for config with defaults applied, such as `BigWigCreateInput` and `BigWigConfig`.

| Input          | Type                 | Default        | Description                                                                                                                                                           |
| -------------- | -------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.id`      | `string`             | Required       | Non-empty ID, unique within the track store.                                                                                                                          |
| `base.title`   | `string`             | Required       | Non-empty display title.                                                                                                                                              |
| `base.display` | Module display name  | Module default | Selects one of the module's renderers.                                                                                                                                |
| `base.height`  | `number`             | Module default | Positive finite height in logical SVG units. Some renderers calculate height from their content.                                                                      |
| `base.color`   | `string`             | Module default | Six-digit `#RRGGBB` color, accepting either letter case.                                                                                                              |
| `config`       | Module config input  | Required       | Source and rendering options listed in the module's reference.                                                                                                        |
| `source`       | `"user"` or `"host"` | `"user"`       | Identifies whether the user or application controls the source. Built-in forms restrict source editing for host-owned tracks as described in each module's reference. |

The returned instance contains `type`, resolved `base`, parsed `config`, `source`, and optional `interaction`. Pass callbacks as the separate second argument to `create`. They remain runtime behavior rather than serialized config. Each module's reference describes supported events and callback items.

## Validate external input

Use `module.configSchema` for config alone or `module.createInputSchema` for the complete creation input. Both are Zod schemas with `parse` and `safeParse` methods:

```ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const result = bigWigModule.createInputSchema.safeParse({
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
});

if (result.success) {
  const track = bigWigModule.create(result.data);
  console.log(track.base.title);
} else {
  console.error(result.error.issues);
}
```

Creation input, base, and the top-level config reject unknown keys. Nested objects follow their module-specific schemas. Validation does not contact a data server or check file contents.

`module.validate(instance)` parses a complete instance, including its type, resolved base, and source. Both `create` and `validate` throw an `Error` containing validation details on failure. Store construction and updates also validate instances. Source ownership controls built-in forms; it does not prevent application code from updating the source through the store.

## Module members

A module exposes its `type`, supported `displays`, both schemas, `create`, `validate`, a `fetch` function, and a `render` map keyed by display name. First-party modules also provide `settingsComponent`; data tracks provide `tooltipComponent`. Core calls the fetcher and hosts these components when rendering the module.

For the general module API and browser stores, see the [core documentation](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/README.md).

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
