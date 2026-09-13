# Track modules

A track module defines one kind of track: how to validate its configuration, fetch its data, draw its display modes, and provide settings or tooltips. A track instance holds the values for one row. You can create several instances of the same module with different data sources or settings.

## defineTrackModule

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

Register the module and add the instance to a [track store](trackStore.md). The module's fetch function can return data without making a network request, as above.

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

## Creating and validating instances

`module.create(input, interaction?)` validates creation input, applies defaults, and returns a runtime instance. `module.validate(instance: unknown)` validates an already-resolved instance. Both throw an `Error` containing validation details on failure.

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
| `source`      | `TrackSource`                               | Resolved source ownership.                                                      |
| `interaction` | `TrackInteraction<InteractionItem, Config>` | Optional instance callbacks.                                                    |

Instance validation requires resolved base values and source. It checks the module type and rejects extra top-level fields, including components or collection metadata. `ReadonlyTrackInstance<Config, InteractionItem>` is a shallow readonly view of this instance, with readonly base and object config properties. It does not deep-freeze nested values.

Use [track-store patches](trackStore.md#trackupdate-and-trackbaseupdate) to edit instances. Collection JSON contains authored creation values and metadata, not code-bearing runtime instances; see [collections](collections.md).

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

`AnyTrackModule` and `AnyTrackInstance` describe heterogeneous registries and track lists. The instance has `config: Record<string, unknown>`; the module exposes its callable creation/validation methods while its fetch and component values are broadly typed. `AnyTrackInteraction` is `TrackInteraction<never, never>` and `AnyTrackTooltipComponent` is `TrackTooltipComponent<never, never>`. These let infrastructure store different module types together. Use the concrete generic contracts when authoring or invoking typed callbacks.

## Fetching data

`TrackFetch<Config, Data>` is `(context: TrackFetchContext<Config>) => Promise<Data>`. Each request receives a track snapshot, the render demand, and track-local resources.

| Context field | Type                      | Contents                                                                  |
| ------------- | ------------------------- | ------------------------------------------------------------------------- |
| `track`       | `TrackFetchTrack<Config>` | Readonly `type`, `base: { id, display }`, and complete parsed config.     |
| `demand`      | `TrackFetchDemand`        | Readonly `assembly`, genomic `region`, and logical SVG `width`.           |
| `resources`   | `TrackResources`          | Storage retained between requests for this track in this mounted browser. |

The snapshots are shallow readonly views. Fetchers may return raw records or process them for the supplied display and width. The requested region includes extra bases outside the visible viewport to support panning. Mark config fields used for requests or fetch-time processing with [fetchOnChange](runtimeHelpers.md#fetchonchange).

A rejected fetch puts that track into an error state. The error message appears as text in its lane, prefixed with the title; long messages wrap and can be scrolled. Other tracks can complete independently. The fetch contract does not include an abort signal.

### TrackResources

Use resources for rebuildable values such as a file reader or a cache. Keys are local to one track type and ID in one mounted browser; stores are not shared across tracks or browser instances.

| Method                             | Result             | Behavior                                                                           |
| ---------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `get<T>(key: string)`              | `T` or `undefined` | Reads a value. The generic type is the caller's assertion, not runtime validation. |
| `set(key: string, value: unknown)` | `void`             | Stores or replaces any value.                                                      |
| `delete(key: string)`              | `void`             | Removes one key.                                                                   |
| `clear()`                          | `void`             | Removes all values for this track.                                                 |

Values persist across requests and demand/config changes. The fetcher decides when a source change requires replacing cached values. Core releases references when a track is removed or the browser unmounts; it provides no disposal callback or eviction policy. Store only values you can rebuild.

## Rendering

`TrackRenderer<Config, Data>` is a React component accepting `TrackRendererProps<Config, Data>`. Render SVG content in the space provided by the track row.

| Prop            | Type            | Description                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------- |
| `id`            | `string`        | Track instance ID.                                                           |
| `config`        | `Config`        | Current parsed configuration.                                                |
| `color`         | `string`        | Resolved base color.                                                         |
| `data`          | `Data`          | Fetch result for the displayed render demand.                                |
| `region`        | `GenomicRegion` | Genomic interval corresponding to the full render width, including overscan. |
| `visibleRegion` | `GenomicRegion` | Current visible viewport.                                                    |
| `width`         | `number`        | Full render width in logical SVG units.                                      |
| `height`        | `number`        | Track drawing height in logical SVG units.                                   |

Use `region` and `width` together for horizontal positioning. Use `visibleRegion` for calculations based on visible features, such as row count. During a same-scale pan, displayed data may still belong to the previous render region while the next request settles. Compare chromosomes when testing feature visibility.

Use [TrackOverlay](TrackOverlay.md) or [TrackLabel](TrackLabel.md) for annotations fixed to the visible plot. The browser owns row controls, loading/error presentation, clipping, and panning.

## Settings

`TrackSettingsComponent<Config, InteractionItem>` is a React component accepting `TrackSettingsProps<Config, InteractionItem>`:

| Prop                 | Type                                                                                                                                     | Description                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `track`              | `ReadonlyTrackInstance<Config, InteractionItem>`                                                                                         | Current complete instance.                                                                                    |
| `displayOptions`     | `readonly string[]`                                                                                                                      | Registered renderer names.                                                                                    |
| `updateTrack`        | `(update: TrackUpdate<Config, InteractionItem>) => TrackMutationResult`                                                                  | Applies a shallow patch to this instance. Its ID is already bound.                                            |
| `updateTracksOfType` | `(createUpdate: (track: ReadonlyTrackInstance<Config, InteractionItem>) => TrackUpdate<Config, InteractionItem>) => TrackMutationResult` | Computes patches for every current same-type track, validates the resulting batch, and commits it atomically. |

The module supplies the complete form, including base controls. The browser supplies the modal shell and rejects these update callbacks while interactions are blocked. Inspect mutation results so rejected edits can be explained to the user. Keep batch-update callbacks free of side effects because validation can reject the batch.

A module without `settingsComponent` has no settings button. Core's [SettingsSection](runtimeHelpers.md#settingssection) provides basic grouping; the tracks package supplies reusable MUI settings controls.

## Interactions and tooltips

`TrackInteraction<Item, Config>` has optional `onClick`, `onHover`, and `onLeave` callbacks. Each is a `TrackInteractionCallback<Item, Config>` with signature `(item: Item, context: TrackRuntimeContext<Config>) => void`.

`TrackRuntimeContext<Config>` contains readonly `type`, `base`, and parsed `config`. It is derived from the current validated instance. It is not persisted state and contains no collection metadata or source field. Object config and base are shallow readonly views.

Renderers choose the semantic item and invoke [useInteraction](runtimeHelpers.md#useinteraction) handlers. The browser binds the runtime context, so `TrackRendererInteraction<Item>` exposes those same optional callback names with item-only signatures `(item: Item) => void`. Callback frequency and which events are emitted depend on the renderer; keep frequent hover handlers lightweight.

`TrackTooltipComponent<Item, Config>` receives required `item: Item` and `context: TrackRuntimeContext<Config>`. Return SVG content; [useTooltip](runtimeHelpers.md#usetooltip) positions it within the browser. Later validated changes appear in later callback invocations and tooltip shows. Renderers and tooltip content own meaningful labels and any supported keyboard behavior; the module contract does not add it automatically.

## defaultScreenGraphQlEndpoint

`defaultScreenGraphQlEndpoint` is the string `"/api/screen-graphql"`. SCREEN-backed features such as the Transcript module use it as their default endpoint. It identifies a same-origin host route; exporting the constant does not create that route or configure authentication.

The host application implements the proxy and adds credentials on its server. Endpoint overrides belong to the feature's configuration and must not contain credentials. Ordinary file-backed tracks do not need this endpoint.
