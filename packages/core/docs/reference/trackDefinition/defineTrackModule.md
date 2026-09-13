# defineTrackModule

A track module defines one kind of track: how to validate its configuration, fetch its data, draw its display modes, and provide settings or tooltips. A track instance holds the values for one row. You can create several instances of the same module with different data sources or settings.

## Usage

Use `defineTrackModule(definition)` to infer configuration, fetched data, and display types. Use `defineTrackModule<Item>()(definition)` when interactions and tooltips need a specific item type.

This module displays intervals supplied directly in its configuration:

```tsx
import { z } from "zod";
import {
  defineTrackModule,
  fetchOnChange,
  type TrackRendererProps,
  type TrackFetchContext,
} from "@weng-lab/genomebrowser";

const configSchema = z.object({
  intervals: fetchOnChange(z.array(z.object({ start: z.number(), end: z.number() }))),
});
type Config = z.output<typeof configSchema>;
type Data = Config["intervals"];

function IntervalRenderer({
  data,
  region,
  width,
  height,
  color,
}: TrackRendererProps<Config, Data>) {
  const x = (base: number) => ((base - region.start) / (region.end - region.start)) * width;
  return (
    <g>
      {data.map((interval, index) => (
        <rect
          key={index}
          x={x(interval.start)}
          y={0}
          width={Math.max(0, x(interval.end) - x(interval.start))}
          height={height}
          fill={color}
        />
      ))}
    </g>
  );
}

const intervalModule = defineTrackModule({
  type: "example-intervals",
  configSchema,
  async fetch({ track }: TrackFetchContext<Config>): Promise<Data> {
    return track.config.intervals;
  },
  render: { full: IntervalRenderer },
});

const track = intervalModule.create({
  base: { id: "intervals", title: "Intervals" },
  config: { intervals: [{ start: 100, end: 200 }] },
});
```

Register the module and add the instance to a [track store](../browserSetup/trackStore.md). The module's fetch function can return data without making a network request, as above.

### Definition options

| Option              | Type                                                    | Default   | Description                                                                                                          |
| ------------------- | ------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `type`              | `string`                                                | Required  | Identifier used to select this module. Must be unique within a registry.                                             |
| `configSchema`      | Zod object schema                                       | Required  | Configuration input, validation, transformations, and defaults. The module makes its top-level config object strict. |
| `fetch`             | `TrackFetch<Config, Data>`                              | Required  | Async function producing data for the requested track and render demand.                                             |
| `render`            | Map of display names to `TrackRenderer<Config, Data>`   | Required  | At least one renderer. Keys become allowed display values; blank names are rejected.                                 |
| `defaults`          | `{ display?: string; height?: number; color?: string }` | See below | Initial base settings used when creation input omits them.                                                           |
| `settingsComponent` | `TrackSettingsComponent<Config, Item>`                  | None      | Complete settings form for an instance.                                                                              |
| `tooltipComponent`  | `TrackTooltipComponent<Item, Config>`                   | None      | SVG content shown by the runtime tooltip hook.                                                                       |

`Config` is the schema's parsed output type. `Data` is inferred from the fetch promise. The default display is the first renderer key; `defaults.display`, when supplied, must match a key. Default height is `80` logical SVG units and default color is `"#000000"`. Invalid displays or base defaults throw during module definition. Put module-specific config defaults in the Zod schema.

## TrackModule and inferred types

`TrackModule<Type, ConfigSchema, Data, Item = unknown, Display = string>` is the returned module contract:

| Member                        | Meaning                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `type`                        | The module's literal identifier.                                                       |
| `displays`                    | Array of allowed display names.                                                        |
| `configSchema`                | Strict configuration schema. Parse it to validate config alone.                        |
| `createInputSchema`           | Strict creation-input schema, including base and source defaults.                      |
| `create(input, interaction?)` | Produces `TrackInstance<z.output<ConfigSchema>, Item>` with the module's literal type. |
| `validate(instance)`          | Validates an unknown runtime instance and returns the same instance type.              |
| `fetch`                       | The supplied fetch function.                                                           |
| `render`                      | Renderer map.                                                                          |
| `settingsComponent`           | Optional settings component.                                                           |
| `tooltipComponent`            | Optional tooltip component.                                                            |

`ModuleCreateInput<M>` extracts input from a module's `createInputSchema`. `ModuleInstance<M>` extracts the return type of its `validate` method. Use these to retain a particular module's config and interaction types in application code.

`AnyTrackModule` and `AnyTrackInstance` describe heterogeneous registries and track lists. The instance has `config: Record<string, unknown>`; the module exposes its callable creation/validation methods while its fetch and component values are broadly typed. `AnyTrackInteraction` is `TrackInteraction<never, never>`. These let infrastructure store different module types together. Use the concrete generic contracts when authoring or invoking typed callbacks.

## Related contracts

- [Track instances](trackInstances.md): creation input, runtime values, validation, and source ownership.
- [Fetching data](fetchingData.md): demand, resources, request triggers, and lifetime.
- [fetchOnChange](fetchOnChange.md): mark configuration used while fetching.
- [Track renderers](../rendererIntegration/trackRenderer.md): SVG props and coordinate systems.
- [Track settings](trackSettings.md): forms and validated mutation callbacks.
- [Interactions](../rendererIntegration/useInteraction.md) and [tooltips](../rendererIntegration/useTooltip.md): typed items and current runtime context.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
