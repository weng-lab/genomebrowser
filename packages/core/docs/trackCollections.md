# Track collections

The collection types, validation functions, and `genomebrowser schema` CLI are exported by `@weng-lab/genomebrowser`.

A track collection is a reusable list of configured tracks for one assembly. Publish it as JSON, generate it from application data, or construct it in TypeScript. You can load tracks directly or offer them through TrackSelect.

## Minimal collection

Only `assembly`, `id`, and `tracks` are required at the collection level:

```json
{
  "assembly": "hg38",
  "id": "signals",
  "tracks": [
    {
      "type": "bigwig",
      "base": {
        "id": "signal-1",
        "title": "Signal 1"
      },
      "config": {
        "url": "YOUR_URL_HERE"
      }
    }
  ]
}
```

Tracks use the same `type`, `base`, and `config` structure as runtime track instances. A module-specific `module.create({ base, config })` call supplies its own `type`. Authored base settings may omit display, height, and color; module creation resolves their defaults. Collection entries may additionally carry optional `metadata`. Interaction callbacks remain application code.

## Assembly and scope

`assembly` is a required, non-empty string identifying the assembly for every track in the collection. It is preserved without normalization, preset lookup, or alias matching. Your application decides whether it matches the active browser and how to present unavailable collections. An omitted identifier never means universal compatibility. Publish separate collections for different assemblies.

The collection does not define chromosome sizes or browser state such as the current region, highlights, or active selection. Its array provides authored track order; using a collection does not imply activating every track. TrackSelect can use views to organize selection and insertion order.

## Load a collection into a browser

```ts
import { createTrackStore, type AnyTrackModule } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { validateJson } from "@weng-lab/genomebrowser";

const modules: AnyTrackModule[] = [bigWigModule];
const useTrackStore = createTrackStore({ modules });
const collection = validateJson(
  {
    assembly: "hg38",
    id: "signals",
    tracks: [
      {
        type: "bigwig",
        base: { id: "signal-1", title: "Signal 1" },
        config: { url: "YOUR_URL_HERE" },
      },
    ],
  },
  modules,
);

const tracks = collection.tracks.map(({ type, base, config }) => {
  const module = modules.find((module) => module.type === type);
  if (!module) throw new Error(`Unsupported track type: ${type}`);
  return module.create({ base, config });
});
useTrackStore.getState().setTracks(tracks);
```

`validateJson` validates module configuration, duplicate track/view IDs, and references to metadata fields. It preserves authored track settings so module creation applies defaults and transformations. It does not add picker views, labels, or metadata to a minimal collection. `TrackCollectionViewSchema` validates an individual view and resolves its grouping and leaf defaults. `createTrackCollectionSchema(modules)` exposes the Zod shape, including module defaults; `generateTrackCollectionJsonSchema(modules)` generates its JSON input schema. See [schema generation](#generate-a-schema-for-collection-json) for editor integration and CLI usage.

Direct creation uses authored track IDs. When combining collections, your application must ensure runtime IDs are unique. TrackSelect uses its documented `${collectionId}::${trackId}` IDs.

To serialize configured runtime tracks, select their `type`, `base`, and `config` fields. Keeping resolved base and config values preserves the user's current settings when the collection is loaded again. Do not serialize interaction callbacks or runtime ownership policy as collection fields.

## Optional descriptions and views

`label` and `description` describe the collection. Track metadata can describe assays, biosamples, provenance, and other scalar attributes independently of any view. A view can reference those attributes to provide a useful browsing layout. Metadata is required only on tracks whose collection views reference its fields.

### Collection options

Each collection describes configured tracks for one assembly. Views and track metadata are optional.

| Option        | Type                       | Default     | Description                                                                                                        |
| ------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `$schema`     | `string`                   | `undefined` | Points JSON editors to a generated track collection schema.                                                        |
| `assembly`    | `string`                   | Required    | Non-empty assembly identifier, preserved exactly. The application defines matching rules.                          |
| `id`          | `string`                   | Required    | Uniquely identifies the collection within `trackCollections` and forms the first part of every qualified track ID. |
| `label`       | `string`                   | `undefined` | Optional display name. TrackSelect falls back to `id`.                                                             |
| `description` | `string`                   | `undefined` | Adds supporting collection text in the selection UI.                                                               |
| `views`       | `TrackCollection["views"]` | `undefined` | Optional non-empty list of browsing views. TrackSelect supplies an ungrouped title view when omitted.              |
| `tracks`      | `TrackCollectionTrack[]`   | Required    | Defines the collection tracks. Track IDs must be unique within the collection.                                     |

With one collection, TrackSelect opens directly on its detail screen. With multiple collections, it opens on the collection list.

### View options

| Option        | Type                             | Default     | Description                                                                                    |
| ------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `id`          | `string`                         | Required    | Uniquely identifies the view within its collection.                                            |
| `label`       | `string`                         | Required    | Names the view in the view selector.                                                           |
| `description` | `string`                         | `undefined` | Stores descriptive view text. The current component accepts this value but does not render it. |
| `columns`     | `TrackCollectionView["columns"]` | Required    | Defines at least one visible or available data field.                                          |
| `grouping`    | `string[]`                       | `[]`        | Lists built-in or metadata fields from the outermost to innermost row group.                   |
| `leaf`        | `string`                         | `"title"`   | Selects the field used to label the final track item.                                          |

The active view determines the order of newly added tracks. Groups follow their first appearance in collection order, nested groups follow `grouping`, and tracks within the final group retain collection order. Switching views can therefore change insertion order on Submit.

In a grouped view, each group checkbox summarizes all selectable descendant tracks, including tracks in nested groups. An unchecked or partially selected group can select all of its descendants, and a fully selected group can deselect them. Groups are grid interactions rather than tracks: TrackSelect keeps only collection-qualified leaf track IDs in the draft, runtime store, and `onCommittedTrackIds` callback.

### Column options

| Option        | Type      | Default                      | Description                                                                                                                            |
| ------------- | --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `field`       | `string`  | Required                     | Selects a built-in field or a metadata key from every collection track.                                                                |
| `label`       | `string`  | Built-in label or field name | Sets the column header. Built-in labels are `ID`, `Title`, and `Type`.                                                                 |
| `description` | `string`  | `undefined`                  | Sets the MUI Data Grid column description.                                                                                             |
| `width`       | `number`  | Flexible width               | Sets a positive fixed width in pixels. Without it, the generated column uses `flex: 1` and `minWidth: 120`.                            |
| `hidden`      | `boolean` | `false`                      | Hides the column initially. Grouping fields, the ID field, and a grouped leaf field are also hidden by the generated visibility model. |

The built-in fields are `id`, `title`, and `type`. Every other field used by `columns`, `grouping`, or `leaf` must exist in every track's `metadata`. Do not use metadata keys named `id`, `title`, or `type`; built-in values take precedence.

### Track options

| Option         | Type                                                  | Default                       | Description                                                                                                                           |
| -------------- | ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `type`         | `string`                                              | Required                      | Selects a track module registered in `useTrackStore`.                                                                                 |
| `base.id`      | `string`                                              | Required                      | Uniquely identifies the track within its collection and forms the second part of its qualified ID.                                    |
| `base.title`   | `string`                                              | Required                      | Sets the track title and the default leaf label.                                                                                      |
| `base.display` | `string`                                              | Module default                | Selects a display supported by the registered module. The module's first display is the fallback when it defines no explicit default. |
| `base.height`  | `number`                                              | Module default or `80`        | Sets the positive initial track height.                                                                                               |
| `base.color`   | `string`                                              | Module default or `"#000000"` | Sets the initial track color when supported by its renderer. It must use six-digit `#RRGGBB` syntax.                                  |
| `config`       | `Record<string, unknown>`                             | Required                      | Supplies create configuration validated by the selected module's schema.                                                              |
| `metadata`     | `Record<string, string or number or boolean or null>` | `undefined`                   | Optional track annotations for search, presentation, grouping, or interaction context. Kept outside the runtime track.                |

Module defaults are applied when a selected track is created during initialization or Submit, not retained as authored collection data during collection validation.

Collection authors cannot set `source`. TrackSelect assigns `source: "host"` when it reconciles a collection entry into the runtime track store.

## Generate a schema for collection JSON

Generate JSON Schema from the same track modules used by your application. Editors that support the standard JSON `$schema` property can then autocomplete collection fields, list allowed track types and displays, and report many invalid module-specific `config` values before runtime.

This workflow creates the following files:

```text
src/
  trackModules.ts
collections/
  signals.json
schemas/
  trackCollection.schema.json
```

### 1. Export the application modules

Export the same module array that the application passes to `createTrackStore`:

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

export const trackModules = [bigWigModule, bigBedModule];
```

The source may export one track module or a non-empty array. Add `#exportName` to select a named export. Without an export name, the CLI uses a valid default export or the only valid track-module export. It reports an error when several exports are possible.

### 2. Generate the schema

Run the package binary from the project root:

```sh
pnpm exec genomebrowser schema \
  --from ./src/trackModules.ts#trackModules \
  --out schemas/trackCollection.schema.json
```

`--from` is repeatable, so one-off generation can combine package and local modules without creating another module array:

```sh
pnpm exec genomebrowser schema \
  --from @weng-lab/genomebrowser-tracks/bigwig#bigWigModule \
  --from ./src/customTrack.ts#customTrackModule
```

The command has these options:

| Option             | Default                         | Description                                                                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--from <source>`  | Required                        | Loads a track module or module array. Repeat it to combine exports. Relative paths resolve from the current directory. |
| `-o, --out <file>` | `"trackCollection.schema.json"` | Writes the schema relative to the current directory. Use `-` for stdout. Missing directories are created.              |
| `--id <uri>`       | `undefined`                     | Adds the supplied value as the generated schema's `$id`.                                                               |
| `--check`          | `false`                         | Exits with an error when the output file is missing or differs from the generated schema.                              |

Use `--check` in CI after committing the generated schema:

```sh
pnpm exec genomebrowser schema \
  --from ./src/trackModules.ts#trackModules \
  --out schemas/trackCollection.schema.json \
  --check
```

When writing a file, the command prints the loaded track types and output path. With `--out -`, it writes only JSON to stdout and reports loaded types on stderr so the output can be piped safely. Run the command again whenever you add or remove a track module, update a module version, or change a module's config schema.

Consider committing the generated schema so editor support and validation do not depend on every contributor running the generator first.

### 3. Connect a collection to the schema

Set `$schema` in each collection JSON file to a path relative to that collection. For the file layout above, `collections/signals.json` starts with:

```json
{
  "assembly": "hg38",
  "$schema": "../schemas/trackCollection.schema.json",
  "id": "signals",
  "label": "Signal tracks",
  "views": [
    {
      "id": "all-signals",
      "label": "All signals",
      "columns": [
        {
          "field": "title",
          "label": "Track"
        }
      ],
      "grouping": [],
      "leaf": "title"
    }
  ],
  "tracks": [
    {
      "base": {
        "id": "example-signal",
        "title": "Example signal"
      },
      "type": "bigwig",
      "config": {
        "url": "YOUR_URL_HERE"
      },
      "metadata": {}
    }
  ]
}
```

Your editor resolves that path from the JSON file. If the editor cannot load the schema, first check that the generated file exists and that the relative path is correct.

The generated file provides JSON-aware completion and validation; it does not turn a JSON import into a TypeScript value with a static `TrackCollection` type. Runtime parsing remains necessary.

### 4. Keep runtime and editor validation aligned

The generator builds module-specific collection entries from each module's `createInputSchema`. Use the same module set for:

- `createTrackStore({ modules })`
- the module array loaded by `genomebrowser schema --from`
- any programmatic `generateTrackCollectionJsonSchema` or `validateJson` calls

The generated schema validates JSON structure, allowed track types and displays, and the parts of module-specific track config represented in JSON Schema. Custom Zod refinements may remain runtime-only after conversion. `TrackSelect` also performs runtime validation for cross-field and multi-collection rules, including metadata fields referenced across views, duplicate qualified track IDs across supplied collections, and selection IDs checked against the complete collection list. Treat editor feedback as an early check, not a replacement for runtime parsing.

For build tooling that already owns a module list, generate the same schema programmatically:

```ts
import { generateTrackCollectionJsonSchema } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const modules = [bigWigModule];
const schema = generateTrackCollectionJsonSchema(modules);
```

Use `validateJson(rawCollection, modules)` when non-React code also needs the runtime parser. `TrackSelect` already calls it for every supplied collection, so normal component integrations do not need to validate a second time.
