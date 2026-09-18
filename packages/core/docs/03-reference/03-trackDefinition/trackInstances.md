# Track instances

Create a runtime instance through its module before adding it to a track store. The module owns configuration validation and defaults; the instance holds one track's settings and callbacks.

## Usage

```ts
import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const input = {
  base: { id: "signal", title: "Signal" },
  config: { url: "YOUR_URL_HERE" },
} satisfies ModuleCreateInput<typeof bigWigModule>;

const track: ModuleInstance<typeof bigWigModule> = bigWigModule.create(input);
```

Replace `YOUR_URL_HERE` with your data URL. The instance has resolved display, height, color, source, and configuration defaults. Pass it to [createTrackStore](../01-browserSetup/trackStore.md) or a store action. The inferred helper types are specified with [TrackModule](defineTrackModule.md#trackmodule-and-inferred-types).

## Creating and validating instances

`module.create(input, interaction?)` validates creation input, applies defaults, and returns a runtime instance. `module.validate(instance: unknown)` validates an instance whose defaults have already been applied. Both return a parsed instance and throw an `Error` containing validation details on failure. They do not add the instance to a store or fetch data.

`validate` parses config with the same schema as `create`; store construction and mutations also invoke module validation. A schema with transformations must also accept its own parsed output, because stores validate instances again. Keep transforms and refinements free of side effects. Collection validation preserves authored inputs, but does not change this runtime validation contract.

### TrackCreateInput and TrackBaseInput

`TrackCreateInput<ConfigInput, Display = string>` contains required `base` and `config`, plus optional `source`. `ConfigInput` is the schema's input type, which can differ from its output when defaults or transformations apply.

| Input          | Type          | Default        | Description                                                         |
| -------------- | ------------- | -------------- | ------------------------------------------------------------------- |
| `base.id`      | `string`      | Required       | Non-empty instance ID, unique within the track store.               |
| `base.title`   | `string`      | Required       | Non-empty display title.                                            |
| `base.display` | `Display`     | Module default | One of the module's renderer keys.                                  |
| `base.height`  | `number`      | Module default | Positive finite row height in logical SVG units.                    |
| `base.color`   | `string`      | Module default | Six-digit `#RRGGBB` color, accepting either letter case.            |
| `config`       | `ConfigInput` | Required       | Values accepted by the module's config schema.                      |
| `source`       | `TrackSource` | `"user"`       | Whether the user or embedding application controls the data source. |

`TrackBaseInput<Display>` describes the `base` input above. Creation input and base objects reject unknown fields. Configuration follows the module's strict top-level schema; nested schemas retain their own validation rules. Pass callbacks as the separate `interaction` argument, not inside creation input.

`TrackSource` is `"user"` or `"host"`. Settings components can use it to disable source controls for host-owned tracks while keeping other settings available. Core does not determine which config fields constitute a source or enforce that UI policy.

### TrackInstance and TrackBase

`TrackInstance<Config, InteractionItem = unknown>` contains:

| Field         | Type                                        | Description                                                                     |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| `type`        | `string`                                    | Module identifier supplied by creation.                                         |
| `base`        | `TrackBase`                                 | Required `id`, `title`, `display`, `height`, and `color`, with the rules above. |
| `config`      | `Config`                                    | Parsed module configuration.                                                    |
| `source`      | `TrackSource`                               | Whether the user or application controls the data source.                       |
| `interaction` | `TrackInteraction<InteractionItem, Config>` | Optional instance callbacks.                                                    |

Instance validation requires resolved base values and source. It checks the module type and rejects extra top-level fields, including components or collection metadata. `ReadonlyTrackInstance<Config, InteractionItem>` is a shallow readonly view of this instance, with readonly base and object config properties. It does not deep-freeze nested values.

Use [track-store patches](../01-browserSetup/trackStore.md#trackupdate-and-trackbaseupdate) to edit instances. Collection JSON stores track creation input and metadata. Runtime callbacks remain in application code. See [collections](../05-collectionsAndSchemas/trackCollection.md).

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
