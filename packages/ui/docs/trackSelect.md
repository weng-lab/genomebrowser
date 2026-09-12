# TrackSelect

`TrackSelect` lets users browse one or more track collections and commit a selection to a runtime track store. Use it with `GenomeBrowser` when your application needs a collection-driven track picker rather than a fixed list of tracks.

## Usage

Create the track store and collection outside React rendering. In a browser integration, pass the same store hook to `TrackSelect` and `GenomeBrowser`.

```tsx
import { useState } from "react";
import { TrackSelect, type TrackCollection } from "@weng-lab/genomebrowser-ui";
import { createTrackStore } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
});

const trackCollections = [
  {
    assembly: "hg38",
    id: "signals",
    label: "Signal tracks",
    views: [
      {
        id: "all-signals",
        label: "All signals",
        columns: [{ field: "title", label: "Track" }],
        grouping: [],
        leaf: "title",
      },
    ],
    tracks: [
      {
        base: {
          id: "example-signal",
          title: "Example signal",
        },
        type: "bigwig",
        config: { url: "YOUR_URL_HERE" },
        metadata: {},
      },
    ],
  },
] satisfies TrackCollection[];

export function TrackPicker() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Choose tracks
      </button>

      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
      />
    </>
  );
}
```

The host controls the dialog through `open` and `onClose`. Browsing and selection changes remain a draft until the user submits them.

See [Getting started](gettingStarted.md) for a complete example in which `TrackSelect` and `GenomeBrowser` share the store.

### Choose JSON or TypeScript collections

Use JSON for static, data-owned collections that benefit from schema-backed editor completion and validation. Use TypeScript when collection entries come from application data or shared constants. For example, you can replace the inline tracks above with generated entries:

```ts
const generatedCollection = {
  ...trackCollections[0],
  tracks: datasets.map((dataset) => ({
    base: {
      id: dataset.id,
      title: dataset.label,
    },
    type: "bigwig",
    config: { url: dataset.url },
    metadata: {},
  })),
} satisfies TrackCollection;
```

The `satisfies` check catches structural TypeScript errors without changing the inferred value type. `TrackSelect` validates both JSON and TypeScript collection values against the track-store registry at runtime.

## Examples

### Set initial and reset selections

Use collection-qualified IDs in the form `${collectionId}::${trackId}`. `initialTrackIds` selects tracks for the current initialization lifetime, while `defaultTrackIds` defines the selection restored by Reset.

```tsx
<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCollections={trackCollections}
  useTrackStore={useTrackStore}
  initialTrackIds={savedTrackIds}
  defaultTrackIds={["signals::example-signal"]}
/>
```

When both props are supplied, `initialTrackIds` takes precedence during initialization. Reset still targets `defaultTrackIds`. Passing an explicit empty array removes all tracks represented by the supplied collections; leaving both props `undefined` preserves the initial store.

Initialization runs when the component mounts and when its initialization identity changes: the store, collection/view/track IDs, effective initial IDs, or `maxTracks`. Changing only `defaultTrackIds` while `initialTrackIds` is present changes the Reset target without rewriting the store. Ordinary updates to the same store do not reapply the initial selection, while a remount starts a new initialization lifetime.

TrackSelect preserves non-collection tracks first in their existing order, followed by initialized collection tracks in the supplied ID order. Reconciled collection tracks always use `source: "host"`. First-party settings visibly disable their data-source URL inputs while title, display, color, height, and unrelated module settings remain editable. Tracks created directly through a module use `source: "user"` unless the caller supplies another source.

### Persist submitted selections

`onCommittedTrackIds` runs after the store accepts Submit. It receives the complete ordered collection selection and excludes tracks outside the supplied collections.

```tsx
<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCollections={trackCollections}
  useTrackStore={useTrackStore}
  onCommittedTrackIds={(trackIds) => {
    sessionStorage.setItem("selectedTracks", JSON.stringify(trackIds));
  }}
/>
```

The callback does not run for initialization, draft actions, Cancel, or failed submissions. Storage access, parsing, and invalid-data handling remain application responsibilities.

### Customize collection columns

Use `columnOverrides` for host-specific MUI Data Grid behavior. Overrides are keyed first by collection ID and then by field. `withValueMarkers` adds a visual marker while preserving the formatted text value.

```tsx
import { TrackSelect, withValueMarkers } from "@weng-lab/genomebrowser-ui";

<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCollections={trackCollections}
  useTrackStore={useTrackStore}
  columnOverrides={{
    signals: {
      assay: withValueMarkers({
        "ATAC-seq": "#02c7b9",
        "RNA-seq": { color: "#00aa00" },
      }),
      biosample: { width: 220 },
    },
  }}
/>;
```

Overrides are shallowly merged into the generated MUI `GridColDef`. Setting `width` disables the generated flexible width unless the override also supplies `flex`. Setting `renderCell` replaces the default truncating, tooltip-enabled renderer. Unknown collection IDs and fields are ignored.

### Attach track interactions

Pass `resolveTrackInteraction` when collection-created tracks need host callbacks. The resolver receives the owning collection ID, qualified track ID, and parsed authored track during initialization and successful Submit reconciliation. It is not called while users browse or edit the draft.

The returned callbacks later receive the renderer item, current v2 runtime context, and collection context. Keep collection JSON data-only and use the resolver to attach application behavior. See [Track interactions](recipes/trackInteractions.md) for a complete typed example.

Without a resolver, TrackSelect preserves an existing interaction on a reused collection track. When a resolver is supplied, its result is authoritative. Changing only the resolver identity does not reinitialize or rewrite tracks.

## API

### TrackSelect props

| Prop                      | Type                                    | Default          | Description                                                                                                                                                       |
| ------------------------- | --------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                    | `boolean`                               | Required         | Controls whether the dialog is open.                                                                                                                              |
| `onClose`                 | `() => void`                            | Required         | Runs after Cancel, the close button, a normal MUI dialog dismissal, or a successful Submit. The host must update `open`.                                          |
| `trackCollections`        | `unknown[]`                             | Required         | Supplies collections to validate against the track-store registry. Keep the array identity stable to avoid reparsing unchanged collections.                       |
| `useTrackStore`           | `TrackStoreInstance`                    | Required         | Provides the runtime track store and module registry used for validation, initialization, and submission. Pass the same hook used by `GenomeBrowser`.             |
| `title`                   | `string`                                | `"Track Select"` | Sets the visible dialog title.                                                                                                                                    |
| `maxTracks`               | `number`                                | `50`             | Limits the total draft selection across all supplied collections. It does not count tracks outside those collections.                                             |
| `initialTrackIds`         | `readonly string[]`                     | `undefined`      | Sets the ordered collection selection during initialization. It takes precedence over `defaultTrackIds` but does not change the Reset target.                     |
| `defaultTrackIds`         | `readonly string[]`                     | `undefined`      | Sets the ordered collection selection used for initialization when `initialTrackIds` is absent and restored by Reset. Without it, Reset clears collection tracks. |
| `onCommittedTrackIds`     | `(trackIds: readonly string[]) => void` | `undefined`      | Runs after a successful Submit with all selected collection-qualified IDs in browser order.                                                                       |
| `columnOverrides`         | `TrackSelectColumnOverrides`            | `undefined`      | Applies host-only MUI Data Grid column options by collection ID and field. The `field` option cannot be overridden.                                               |
| `resolveTrackInteraction` | `TrackSelectInteractionResolver`        | `undefined`      | Resolves application callbacks for selected collection tracks during initialization and Submit reconciliation.                                                    |

### Dialog actions

- **Clear** confirms before clearing the active collection on a detail screen or all collections on the collection-list screen.
- **Reset** confirms before restoring `defaultTrackIds` in their supplied order. Without defaults, it clears collection tracks. It never changes tracks outside the collections.
- **Cancel**, the close button, and normal dialog dismissal discard the current draft and call `onClose`.
- **Submit** creates additions through the track-store registry and applies collection additions and removals as one store update. A successful Submit calls `onCommittedTrackIds`, then `onClose`.

If track creation, interaction validation, or the store update fails, the store remains unchanged and the dialog stays open with an error.

### Collections

See [Track collections](trackCollections.md) for the portable JSON format, assembly identifiers, track configuration, and optional views and metadata.

TrackSelect displays each collection's assembly identifier. It uses `label ?? id` as the collection name and an ungrouped title view when `views` is omitted. The view selector appears only when there are multiple views. Assembly matching and filtering are application responsibilities; TrackSelect does not select or change the browser assembly.

### Qualified track IDs and ownership

The public qualified ID format is `${collectionId}::${trackId}`. Use it in `initialTrackIds`, `defaultTrackIds`, and values received by `onCommittedTrackIds`. Duplicate IDs, unknown IDs, and initialization lists longer than `maxTracks` are rejected.

TrackSelect treats any store track whose ID matches a supplied collection entry as collection-owned. Reconciliation sets both new and reused collection tracks to `source: "host"`, regardless of their previous source. Give fixed or non-collection tracks IDs outside that reserved set. If application code inserts a different track with a reserved ID, initialization or Submit may reuse or remove it during normal reconciliation.

### Column override options

`TrackSelectColumnOverrides` is a read-only map shaped as `collectionId -> field -> TrackSelectColumnOverride`. A `TrackSelectColumnOverride` accepts every partial MUI `GridColDef` option except `field`, which always comes from the collection view.

`withValueMarkers` accepts a read-only value map:

| Value        | Type                            | Description                                                                                           |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Marker key   | `string`                        | Matches the string form of a cell's formatted value, or its raw value when no formatted value exists. |
| Marker value | `string` or `{ color: string }` | Sets the square marker color. Values without a configured marker keep the normal cell renderer.       |

### Interaction options

`TrackSelectInteractionResolver` receives one object:

| Field              | Type                   | Description                                           |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| `collectionId`     | `string`               | Identifies the owning collection.                     |
| `qualifiedTrackId` | `string`               | Provides the public `${collectionId}::${trackId}` ID. |
| `track`            | `TrackCollectionTrack` | Provides the parsed authored collection track.        |

It returns `TrackSelectInteraction` or `undefined`. When supplied, resolver output is authoritative: `undefined` removes an existing interaction from a reused collection track, and a returned object replaces all callbacks rather than merging them.

| Callback  | Signature                             | Description                                       |
| --------- | ------------------------------------- | ------------------------------------------------- |
| `onClick` | `(item, runtime, collection) => void` | Runs when the renderer emits a click interaction. |
| `onHover` | `(item, runtime, collection) => void` | Runs when the renderer emits a hover interaction. |
| `onLeave` | `(item, runtime, collection) => void` | Runs when the renderer emits a leave interaction. |

The callback's `collection` argument is a `TrackSelectCollectionContext`:

| Field             | Type                      | Description                                                                       |
| ----------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `collectionId`    | `string`                  | Identifies the owning collection.                                                 |
| `authoredTrackId` | `string`                  | Provides the unqualified track ID authored in the collection.                     |
| `metadata`        | `Readonly<TrackMetadata>` | Provides the collection-owned metadata without copying it into the runtime track. |

The runtime context comes from v2 when the event occurs, so later base or config changes are visible without rerunning the resolver.

### Related exports

| Export                              | Signature                                                                 | Description                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `withValueMarkers`                  | `(markers: ValueMarkerMap) => TrackSelectColumnOverride`                  | Creates a column override that adds square color markers to configured formatted values.        |
| `generateTrackCollectionJsonSchema` | `(modules: readonly AnyTrackModule[]) => object`                          | Generates JSON Schema for collections using the supplied modules’ create schemas.               |
| `validateJson`                      | `(input: unknown, modules: readonly AnyTrackModule[]) => TrackCollection` | Validates and parses one collection against a module list. `TrackSelect` calls this internally. |

### Generate a schema for collection JSON

Generate JSON Schema from the same track modules used by your application. Editors that support the standard JSON `$schema` property can then autocomplete collection fields, list allowed track types and displays, and report many invalid module-specific `config` values before runtime.

This workflow creates the following files:

```text
src/
  trackModules.ts
collections/
  signals.json
schemas/
  trackSelectCollection.schema.json
```

#### 1. Export the application modules

Export the same module array that the application passes to `createTrackStore`:

```ts
import { bigBedModule } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

export const trackModules = [bigWigModule, bigBedModule];
```

The source may export one track module or a non-empty array. Add `#exportName` to select a named export. Without an export name, the CLI uses a valid default export or the only valid track-module export. It reports an error when several exports are possible.

#### 2. Generate the schema

Run the package binary from the project root:

```sh
pnpm exec trackselect schema \
  --from ./src/trackModules.ts#trackModules \
  --out schemas/trackSelectCollection.schema.json
```

`--from` is repeatable, so one-off generation can combine package and local modules without creating another module array:

```sh
pnpm exec trackselect schema \
  --from @weng-lab/genomebrowser-tracks/bigwig#bigWigModule \
  --from ./src/customTrack.ts#customTrackModule
```

The command has these options:

| Option             | Default                               | Description                                                                                                            |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--from <source>`  | Required                              | Loads a track module or module array. Repeat it to combine exports. Relative paths resolve from the current directory. |
| `-o, --out <file>` | `"trackSelectCollection.schema.json"` | Writes the schema relative to the current directory. Use `-` for stdout. Missing directories are created.              |
| `--id <uri>`       | `undefined`                           | Adds the supplied value as the generated schema's `$id`.                                                               |
| `--check`          | `false`                               | Exits with an error when the output file is missing or differs from the generated schema.                              |

Use `--check` in CI after committing the generated schema:

```sh
pnpm exec trackselect schema \
  --from ./src/trackModules.ts#trackModules \
  --out schemas/trackSelectCollection.schema.json \
  --check
```

When writing a file, the command prints the loaded track types and output path. With `--out -`, it writes only JSON to stdout and reports loaded types on stderr so the output can be piped safely. Run the command again whenever you add or remove a track module, update a module version, or change a module's config schema.

Consider committing the generated schema so editor support and validation do not depend on every contributor running the generator first.

#### 3. Connect a collection to the schema

Set `$schema` in each collection JSON file to a path relative to that collection. For the file layout above, `collections/signals.json` starts with:

```json
{
  "assembly": "hg38",
  "$schema": "../schemas/trackSelectCollection.schema.json",
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

#### 4. Keep runtime and editor validation aligned

The generator builds module-specific collection entries from each module's `createInputSchema`. Use the same module set for:

- `createTrackStore({ modules })`
- the module array loaded by `trackselect schema --from`
- any programmatic `generateTrackCollectionJsonSchema` or `validateJson` calls

The generated schema validates JSON structure, allowed track types and displays, and the parts of module-specific track config represented in JSON Schema. Custom Zod refinements may remain runtime-only after conversion. `TrackSelect` also performs runtime validation for cross-field and multi-collection rules, including metadata fields referenced across views, duplicate qualified track IDs across supplied collections, and selection IDs checked against the complete collection list. Treat editor feedback as an early check, not a replacement for runtime parsing.

For build tooling that already owns a module list, generate the same schema programmatically:

```ts
import { generateTrackCollectionJsonSchema } from "@weng-lab/genomebrowser-ui";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const modules = [bigWigModule];
const schema = generateTrackCollectionJsonSchema(modules);
```

Use `validateJson(rawCollection, registry)` when non-React code also needs the runtime parser. `TrackSelect` already calls it for every supplied collection, so normal component integrations do not need to validate a second time.

## Accessibility

- TrackSelect renders a MUI modal dialog and inherits its focus management and Escape-key dismissal behavior. The host must close the controlled dialog when `onClose` runs.
- The close icon button has the accessible name `Close track select`. Clear, Reset, Cancel, Submit, and collection navigation use text-labeled buttons.
- Removing a selected node uses an accessible name in the form `Remove {track label}`.
- Collection selection and view controls use MUI X Data Grid Premium, MUI Select, and MUI X Tree View keyboard and focus behavior.
- Markers created by `withValueMarkers` are hidden from assistive technology; the formatted text remains available. If you replace `renderCell`, you are responsible for preserving an accessible text equivalent and keyboard behavior.
- MUI associates the visible `title` with the dialog as its accessible name. The view selector does not currently have a package-supplied accessible label, and TrackSelect does not expose a prop that lets the host provide one.

## Notes

### Selection and validation constraints

- `maxTracks` counts selected collection entries across all supplied collections, not unrelated store tracks. Attempts to increase the draft past the limit open a limit dialog; removing selections remains possible.
- Collection IDs must be unique in `trackCollections`, and track IDs must be unique within a collection. The same authored track ID may appear in different collections because TrackSelect qualifies it with the collection ID.
- TrackSelect validates collections against the registry before rendering dialog content. Unknown track types, unsupported properties, invalid module config, and missing view metadata fail validation.
- Use the same module set for the track store, JSON Schema generation, and standalone validation. A collection generated for one registry can fail against another.
- Keep `trackCollections` stable. Recreating the array causes unchanged collections to be parsed again and can change initialization identity if collection, view, or track IDs also change.

### Theme and licensing

TrackSelect uses the host application's MUI theme and needs no package-specific stylesheet or provider. It uses MUI X Premium components; the host must configure its own MUI X Premium license before rendering the component.

### Troubleshooting

**The collection fails to open:** Read the `Track collection is invalid` error. Confirm that every `type` is registered, every `config` matches its module, view fields exist in each track's metadata, and the collection has no unsupported properties.

**A track cannot be selected:** Check the total collection selection against `maxTracks`. The limit applies across collections, and a blocked increase opens the track-limit dialog.

**Submit shows an error:** Confirm that schema tooling and the application use the same modules and versions. Check that selected tracks still satisfy their modules and that the interaction resolver returns only supported callback functions.

**Submit order is unexpected:** Check the active view. Its grouping fields and the collection's source order determine newly added track order; existing tracks retain their relative order.
