# Track collections

A collection describes configured tracks for one assembly. Use it to load tracks from JSON or to offer a catalog through collection UI. Core provides the types, validation, and schema generation; the application decides which tracks to activate.

## Usage

Choose the modules your application supports and use the same list for editor tooling, validation, and the track store:

```ts
// trackModules.ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

export const trackModules = [bigWigModule] as const;
```

### Author JSON

Generate an editor schema from those modules with the [schema CLI](schemaCli.md):

```sh
pnpm exec genomebrowser schema --from ./trackModules.ts#trackModules --out ./trackCollection.schema.json
```

Reference it in a collection file for module-aware completion and structural checks:

```json
{
  "$schema": "./trackCollection.schema.json",
  "assembly": "hg38",
  "id": "signals",
  "tracks": [
    {
      "type": "bigwig",
      "base": { "id": "signal", "title": "Signal" },
      "config": { "url": "YOUR_URL_HERE" }
    }
  ]
}
```

### Author TypeScript

Use `satisfies TrackCollection<typeof trackModules>` to check each track's type, display, and config against its module's creation input. Config defaults remain optional and transformations use their input types. Keep the module list specific, for example with `as const`, rather than annotating it as `AnyTrackModule[]`.

```ts
import type { TrackCollection } from "@weng-lab/genomebrowser";
import { trackModules } from "./trackModules";

const datasets = [{ id: "signal", title: "Signal", url: "YOUR_URL_HERE" }];

export const authoredCollection = {
  assembly: "hg38",
  id: "signals",
  tracks: datasets.map(({ id, title, url }) => ({
    type: "bigwig" as const,
    base: { id, title },
    config: { url },
  })),
} satisfies TrackCollection<typeof trackModules>;
```

You can also write the `tracks` array directly for a small collection. TypeScript checks types; runtime validation additionally checks constraints such as non-empty strings, duplicate IDs, and metadata references.

### Validate and create tracks

Both authoring routes use the same runtime path. Here, `input` is an imported collection object, the result of `JSON.parse`, or an authored TypeScript object:

```ts
import { createTrackStore, validateTrackCollection } from "@weng-lab/genomebrowser";
import { trackModules } from "./trackModules";

const useTrackStore = createTrackStore({ modules: trackModules });
const { registry } = useTrackStore.getState();
const collection = validateTrackCollection(input, registry.modules);
const tracks = collection.tracks.map(({ type, base, config }) =>
  registry.get(type).create({ base, config }),
);
const result = useTrackStore.getState().setTracks(tracks);
if (!result.ok) throw new Error(result.error);
```

[Validation](validateTrackCollection.md) does not add tracks to a browser. Create all entries or only those your application selects, then use a [track-store action](../browserSetup/trackStore.md). With multiple module types, narrow an entry by its `type` before calling a specific module when TypeScript needs to preserve the relationship between that module and its config. TrackSelect handles validation and selected-track creation for its supplied collections.

## TrackCollection

`TrackCollection<Modules>` describes authored input. `Modules` defaults to `readonly AnyTrackModule[]` for general collection handling. Supply `typeof trackModules` to derive a union of entries from specific modules. Views may omit defaults; validated views have `grouping` and `leaf` resolved.

| Field         | Type                  | Default  | Description                                                                                                                      |
| ------------- | --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`     | `string`              | Omitted  | Non-empty schema reference for JSON editors. Core preserves it without fetching the schema.                                      |
| `assembly`    | `string`              | Required | Non-empty assembly identifier. Core preserves its exact spelling; the application decides whether it matches the active browser. |
| `id`          | `string`              | Required | Non-empty collection identifier. Applications combining collections must ensure unique IDs.                                      |
| `label`       | `string`              | Omitted  | Optional non-empty display name.                                                                                                 |
| `description` | `string`              | Omitted  | Optional non-empty descriptive text.                                                                                             |
| `views`       | Array of view inputs  | Omitted  | If supplied, at least one view. View input may omit `grouping` and `leaf`.                                                       |
| `tracks`      | Array of track inputs | Required | Authored entries in collection order. May be empty; track IDs must be unique within a validated collection.                      |

A collection does not contain chromosome lengths, viewport state, highlights, or selection mode. Its assembly ID does not perform preset lookup or alias matching. Use separate collections for different assemblies. Objects reject unknown collection-level fields.

### Track inputs

An entry is an authored recipe, not a runtime `TrackInstance`. Derive its type from the collection when needed:

```ts
type CollectionTrack = TrackCollection<typeof trackModules>["tracks"][number];
```

Its config and display are correlated with its module type. Without a module parameter, config is `Record<string, unknown>` and the module type is `string`.

| Field      | Type                      | Default  | Description                                                                                                                                                      |
| ---------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `string`                  | Required | Registered module type.                                                                                                                                          |
| `base`     | `TrackBaseInput`          | Required | Required ID and title, plus optional display, height, and color. See [creation input](../trackDefinition/trackInstances.md#trackcreateinput-and-trackbaseinput). |
| `config`   | `Record<string, unknown>` | Required | Input validated by the selected module's config schema.                                                                                                          |
| `metadata` | `TrackMetadata`           | Omitted  | Scalar attributes used to describe and organize tracks.                                                                                                          |

Collection entries reject `source` and interaction callbacks. Supply runtime ownership and interactions in application code during module creation. Metadata stays with the collection rather than becoming part of the runtime instance.

When serializing runtime tracks, config must still satisfy the module's creation input. A transformed runtime config is not necessarily valid collection input; preserve authored values or explicitly convert them back to input form.

### TrackMetadata

`TrackMetadata` is `Record<string, string | number | boolean | null>`. Values cannot be arrays or nested objects. Metadata stays separate from module config and runtime interaction context.

The built-in view fields are `id`, `title`, and `type`. All other referenced fields must exist in every track's metadata. Avoid using those built-in names as metadata keys because collection UI treats them as built-in values.

## Views and columns

Views describe ways a collection UI can organize tracks. Core validates their structure and field references; rendering and selection behavior belong to the UI consuming them.

### TrackCollectionView

`TrackCollectionView` describes a validated view with defaults resolved. For authoring, use the view input type within `TrackCollection["views"]`.

| Field         | Type                      | Default   | Description                                                  |
| ------------- | ------------------------- | --------- | ------------------------------------------------------------ |
| `id`          | `string`                  | Required  | Non-empty view ID, unique within the collection.             |
| `label`       | `string`                  | Required  | Non-empty display name.                                      |
| `description` | `string`                  | Omitted   | Optional non-empty descriptive text.                         |
| `columns`     | `TrackCollectionColumn[]` | Required  | Non-empty list of available fields.                          |
| `grouping`    | `string[]`                | `[]`      | Non-empty field names in outermost-to-innermost group order. |
| `leaf`        | `string`                  | `"title"` | Non-empty field name used to label a final track item.       |

`validateTrackCollection` checks view structure, ID uniqueness, and references to track metadata, and applies these defaults. View objects reject unknown fields.

### TrackCollectionColumn

| Field         | Type      | Default  | Description                                         |
| ------------- | --------- | -------- | --------------------------------------------------- |
| `field`       | `string`  | Required | Non-empty built-in field or metadata key.           |
| `label`       | `string`  | Omitted  | Optional non-empty column label.                    |
| `description` | `string`  | Omitted  | Optional non-empty column description.              |
| `width`       | `number`  | Omitted  | Positive finite preferred column width.             |
| `hidden`      | `boolean` | Omitted  | Initial visibility preference for the consuming UI. |

These are schema defaults. Label fallbacks, column sizing, and visibility behavior depend on the UI component.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
