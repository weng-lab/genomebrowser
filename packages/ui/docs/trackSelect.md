# TrackSelect

`TrackSelect` lets users browse one or more track catalogs and commit a selection to a runtime track store. Use it with `GenomeBrowser` when your application needs a catalog-driven track picker rather than a fixed list of tracks.

## Usage

Create the track store and catalog outside React rendering. In a browser integration, pass the same store hook to `TrackSelect` and `GenomeBrowser`.

```tsx
import { useState } from "react";
import { TrackSelect, type TrackSelectCatalog } from "@weng-lab/genomebrowser-ui";
import { bigWigModule, createTrackStore } from "@weng-lab/genomebrowser";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
});

const trackCatalogs = [
  {
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
        type: "bigwig",
        id: "example-signal",
        title: "Example signal",
        config: { url: "YOUR_URL_HERE" },
        metadata: {},
      },
    ],
  },
] satisfies TrackSelectCatalog[];

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
        trackCatalogs={trackCatalogs}
        useTrackStore={useTrackStore}
      />
    </>
  );
}
```

The host controls the dialog through `open` and `onClose`. Browsing and selection changes remain a draft until the user submits them.

See [Getting started](gettingStarted.md) for a complete example in which `TrackSelect` and `GenomeBrowser` share the store.

### Choose JSON or TypeScript catalogs

Use JSON for static, data-owned catalogs that benefit from schema-backed editor completion and validation. Use TypeScript when catalog entries come from application data or shared constants. For example, you can replace the inline tracks above with generated entries:

```ts
const generatedCatalog = {
  ...trackCatalogs[0],
  tracks: datasets.map((dataset) => ({
    type: "bigwig",
    id: dataset.id,
    title: dataset.label,
    config: { url: dataset.url },
    metadata: {},
  })),
} satisfies TrackSelectCatalog;
```

The `satisfies` check catches structural TypeScript errors without changing the inferred value type. `TrackSelect` validates both JSON and TypeScript catalog values against the track-store registry at runtime.

## Examples

### Set initial and reset selections

Use catalog-qualified IDs in the form `${catalogId}::${trackId}`. `initialTrackIds` selects tracks for the current initialization lifetime, while `defaultTrackIds` defines the selection restored by Reset.

```tsx
<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCatalogs={trackCatalogs}
  useTrackStore={useTrackStore}
  initialTrackIds={savedTrackIds}
  defaultTrackIds={["signals::example-signal"]}
/>
```

When both props are supplied, `initialTrackIds` takes precedence during initialization. Reset still targets `defaultTrackIds`. Passing an explicit empty array removes all tracks represented by the supplied catalogs; leaving both props `undefined` preserves the initial store.

Initialization runs when the component mounts and when its initialization identity changes: the store, catalog/view/track IDs, effective initial IDs, or `maxTracks`. Changing only `defaultTrackIds` while `initialTrackIds` is present changes the Reset target without rewriting the store. Ordinary updates to the same store do not reapply the initial selection, while a remount starts a new initialization lifetime.

TrackSelect preserves non-catalog tracks first in their existing order, followed by initialized catalog tracks in the supplied ID order.

### Persist submitted selections

`onCommittedTrackIds` runs after the store accepts Submit. It receives the complete ordered catalog selection and excludes tracks outside the supplied catalogs.

```tsx
<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCatalogs={trackCatalogs}
  useTrackStore={useTrackStore}
  onCommittedTrackIds={(trackIds) => {
    sessionStorage.setItem("selectedTracks", JSON.stringify(trackIds));
  }}
/>
```

The callback does not run for initialization, draft actions, Cancel, or failed submissions. Storage access, parsing, and invalid-data handling remain application responsibilities.

### Customize catalog columns

Use `columnOverrides` for host-specific MUI Data Grid behavior. Overrides are keyed first by catalog ID and then by field. `withValueMarkers` adds a visual marker while preserving the formatted text value.

```tsx
import { TrackSelect, withValueMarkers } from "@weng-lab/genomebrowser-ui";

<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCatalogs={trackCatalogs}
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

Overrides are shallowly merged into the generated MUI `GridColDef`. Setting `width` disables the generated flexible width unless the override also supplies `flex`. Setting `renderCell` replaces the default truncating, tooltip-enabled renderer. Unknown catalog IDs and fields are ignored.

### Attach track interactions

Pass `resolveTrackInteraction` when catalog-created tracks need host callbacks. The resolver receives the owning catalog ID, qualified track ID, and parsed authored track during initialization and successful Submit reconciliation. It is not called while users browse or edit the draft.

The returned callbacks later receive the renderer item, current v2 runtime context, and catalog context. Keep catalog JSON data-only and use the resolver to attach application behavior. See [Track interactions](recipes/trackInteractions.md) for a complete typed example.

Without a resolver, TrackSelect preserves an existing interaction on a reused catalog track. When a resolver is supplied, its result is authoritative. Changing only the resolver identity does not reinitialize or rewrite tracks.

## API

### TrackSelect props

| Prop                      | Type                                    | Default          | Description                                                                                                                                                 |
| ------------------------- | --------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                    | `boolean`                               | Required         | Controls whether the dialog is open.                                                                                                                        |
| `onClose`                 | `() => void`                            | Required         | Runs after Cancel, the close button, a normal MUI dialog dismissal, or a successful Submit. The host must update `open`.                                    |
| `trackCatalogs`           | `unknown[]`                             | Required         | Supplies catalogs to validate against the track-store registry. Keep the array identity stable to avoid reparsing unchanged catalogs.                       |
| `useTrackStore`           | `TrackStoreInstance`                    | Required         | Provides the runtime track store and module registry used for validation, initialization, and submission. Pass the same hook used by `GenomeBrowser`.       |
| `title`                   | `string`                                | `"Track Select"` | Sets the visible dialog title.                                                                                                                              |
| `maxTracks`               | `number`                                | `50`             | Limits the total draft selection across all supplied catalogs. It does not count tracks outside those catalogs.                                             |
| `initialTrackIds`         | `readonly string[]`                     | `undefined`      | Sets the ordered catalog selection during initialization. It takes precedence over `defaultTrackIds` but does not change the Reset target.                  |
| `defaultTrackIds`         | `readonly string[]`                     | `undefined`      | Sets the ordered catalog selection used for initialization when `initialTrackIds` is absent and restored by Reset. Without it, Reset clears catalog tracks. |
| `onCommittedTrackIds`     | `(trackIds: readonly string[]) => void` | `undefined`      | Runs after a successful Submit with all selected catalog-qualified IDs in browser order.                                                                    |
| `columnOverrides`         | `TrackSelectColumnOverrides`            | `undefined`      | Applies host-only MUI Data Grid column options by catalog ID and field. The `field` option cannot be overridden.                                            |
| `resolveTrackInteraction` | `TrackSelectInteractionResolver`        | `undefined`      | Resolves application callbacks for selected catalog tracks during initialization and Submit reconciliation.                                                 |

### Dialog actions

- **Clear** confirms before clearing the active catalog on a detail screen or all catalogs on the catalog-list screen.
- **Reset** confirms before restoring `defaultTrackIds` in their supplied order. Without defaults, it clears catalog tracks. It never changes tracks outside the catalogs.
- **Cancel**, the close button, and normal dialog dismissal discard the current draft and call `onClose`.
- **Submit** creates additions through the track-store registry and applies catalog additions and removals as one store update. A successful Submit calls `onCommittedTrackIds`, then `onClose`.

If track creation, interaction validation, or the store update fails, the store remains unchanged and the dialog stays open with an error.

### Catalog options

Each catalog describes available tracks and one or more ways to view them.

| Option        | Type                          | Default     | Description                                                                                                  |
| ------------- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `$schema`     | `string`                      | `undefined` | Points JSON editors to a generated TrackSelect catalog schema.                                               |
| `id`          | `string`                      | Required    | Uniquely identifies the catalog within `trackCatalogs` and forms the first part of every qualified track ID. |
| `label`       | `string`                      | Required    | Names the catalog in the catalog list and selection tree.                                                    |
| `description` | `string`                      | `undefined` | Adds supporting catalog text in the selection UI.                                                            |
| `views`       | `TrackSelectCatalog["views"]` | Required    | Defines one or more table layouts over the same tracks. At least one view is required.                       |
| `tracks`      | `TrackSelectTrack[]`          | Required    | Defines the catalog tracks. Track IDs must be unique within the catalog.                                     |

With one catalog, TrackSelect opens directly on its detail screen. With multiple catalogs, it opens on the catalog list.

### View options

| Option        | Type                                             | Default     | Description                                                                                    |
| ------------- | ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------- |
| `id`          | `string`                                         | Required    | Uniquely identifies the view within its catalog.                                               |
| `label`       | `string`                                         | Required    | Names the view in the view selector.                                                           |
| `description` | `string`                                         | `undefined` | Stores descriptive view text. The current component accepts this value but does not render it. |
| `columns`     | `TrackSelectCatalog["views"][number]["columns"]` | Required    | Defines at least one visible or available data field.                                          |
| `grouping`    | `string[]`                                       | `[]`        | Lists built-in or metadata fields from the outermost to innermost row group.                   |
| `leaf`        | `string`                                         | `"title"`   | Selects the field used to label the final track item.                                          |

The active view determines the order of newly added tracks. Groups follow their first appearance in catalog order, nested groups follow `grouping`, and tracks within the final group retain catalog order. Switching views can therefore change insertion order on Submit.

### Column options

| Option        | Type      | Default                      | Description                                                                                                                            |
| ------------- | --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `field`       | `string`  | Required                     | Selects a built-in field or a metadata key from every catalog track.                                                                   |
| `label`       | `string`  | Built-in label or field name | Sets the column header. Built-in labels are `ID`, `Title`, and `Type`.                                                                 |
| `description` | `string`  | `undefined`                  | Sets the MUI Data Grid column description.                                                                                             |
| `width`       | `number`  | Flexible width               | Sets a positive fixed width in pixels. Without it, the generated column uses `flex: 1` and `minWidth: 120`.                            |
| `hidden`      | `boolean` | `false`                      | Hides the column initially. Grouping fields, the ID field, and a grouped leaf field are also hidden by the generated visibility model. |

The built-in fields are `id`, `title`, and `type`. Every other field used by `columns`, `grouping`, or `leaf` must exist in every track's `metadata`. Do not use metadata keys named `id`, `title`, or `type`; built-in values take precedence.

### Track options

| Option     | Type                                                  | Default                | Description                                                                                                                           |
| ---------- | ----------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `string`                                              | Required               | Selects a track module registered in `useTrackStore`.                                                                                 |
| `id`       | `string`                                              | Required               | Uniquely identifies the track within its catalog and forms the second part of its qualified ID.                                       |
| `title`    | `string`                                              | Required               | Sets the track title and the default leaf label.                                                                                      |
| `display`  | `string`                                              | Module default         | Selects a display supported by the registered module. The module's first display is the fallback when it defines no explicit default. |
| `height`   | `number`                                              | Module default or `80` | Sets the positive initial track height.                                                                                               |
| `color`    | `string`                                              | `undefined`            | Sets the initial track color when supported by its renderer.                                                                          |
| `config`   | `Record<string, unknown>`                             | Required               | Supplies create configuration validated by the selected module's schema.                                                              |
| `metadata` | `Record<string, string or number or boolean or null>` | `{}`                   | Supplies catalog-only values for columns, grouping, labels, and interaction context. It is not copied into the runtime track.         |

Module defaults are applied when a selected track is created during initialization or Submit, not retained as authored catalog data during catalog validation.

### Qualified track IDs and ownership

The public qualified ID format is `${catalogId}::${trackId}`. Use it in `initialTrackIds`, `defaultTrackIds`, and values received by `onCommittedTrackIds`. Duplicate IDs, unknown IDs, and initialization lists longer than `maxTracks` are rejected.

TrackSelect treats any store track whose ID matches a supplied catalog entry as catalog-owned. Give fixed or non-catalog tracks IDs outside that reserved set. If application code inserts a different track with a reserved ID, initialization or Submit may reuse or remove it during normal reconciliation.

### Column override options

`TrackSelectColumnOverrides` is a read-only map shaped as `catalogId -> field -> TrackSelectColumnOverride`. A `TrackSelectColumnOverride` accepts every partial MUI `GridColDef` option except `field`, which always comes from the catalog view.

`withValueMarkers` accepts a read-only value map:

| Value        | Type                            | Description                                                                                           |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Marker key   | `string`                        | Matches the string form of a cell's formatted value, or its raw value when no formatted value exists. |
| Marker value | `string` or `{ color: string }` | Sets the square marker color. Values without a configured marker keep the normal cell renderer.       |

### Interaction options

`TrackSelectInteractionResolver` receives one object:

| Field              | Type               | Description                                        |
| ------------------ | ------------------ | -------------------------------------------------- |
| `catalogId`        | `string`           | Identifies the owning catalog.                     |
| `qualifiedTrackId` | `string`           | Provides the public `${catalogId}::${trackId}` ID. |
| `track`            | `TrackSelectTrack` | Provides the parsed authored catalog track.        |

It returns `TrackSelectInteraction` or `undefined`. When supplied, resolver output is authoritative: `undefined` removes an existing interaction from a reused catalog track, and a returned object replaces all callbacks rather than merging them.

| Callback  | Signature                          | Description                                       |
| --------- | ---------------------------------- | ------------------------------------------------- |
| `onClick` | `(item, runtime, catalog) => void` | Runs when the renderer emits a click interaction. |
| `onHover` | `(item, runtime, catalog) => void` | Runs when the renderer emits a hover interaction. |
| `onLeave` | `(item, runtime, catalog) => void` | Runs when the renderer emits a leave interaction. |

The callback's `catalog` argument is a `TrackSelectCatalogContext`:

| Field             | Type                            | Description                                                                    |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `catalogId`       | `string`                        | Identifies the owning catalog.                                                 |
| `authoredTrackId` | `string`                        | Provides the unqualified track ID authored in the catalog.                     |
| `metadata`        | `Readonly<TrackSelectMetadata>` | Provides the catalog-owned metadata without copying it into the runtime track. |

The runtime context comes from v2 when the event occurs, so later base or config changes are visible without rerunning the resolver.

### Related exports

| Export                           | Signature                                                          | Description                                                                                      |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `withValueMarkers`               | `(markers: ValueMarkerMap) => TrackSelectColumnOverride`           | Creates a column override that adds square color markers to configured formatted values.         |
| `generateTrackCatalogJsonSchema` | `(registry: ModuleRegistry) => object`                             | Generates JSON Schema for catalogs using the registry's module-specific create schemas.          |
| `validateJson`                   | `(input: unknown, registry: ModuleRegistry) => TrackSelectCatalog` | Validates and parses one catalog against a module registry. `TrackSelect` calls this internally. |

### Generate a schema for catalog JSON

Generate JSON Schema from the same track modules used by your application. Editors that support the standard JSON `$schema` property can then autocomplete catalog fields, list allowed track types and displays, and report many invalid module-specific `config` values before runtime.

This workflow creates the following files:

```text
trackselect.config.ts
catalogs/
  signals.json
schemas/
  trackSelectCatalog.schema.json
```

#### 1. Configure the generator

Create `trackselect.config.ts` in the directory where you will run the command:

```ts
import { defineTrackSelectConfig } from "@weng-lab/genomebrowser-ui/cli";
import { bigBedModule, bigWigModule } from "@weng-lab/genomebrowser";

export default defineTrackSelectConfig({
  modules: [bigWigModule, bigBedModule],
  schema: {
    outFile: "schemas/trackSelectCatalog.schema.json",
  },
});
```

The configuration has these public options:

| Option           | Type                        | Default                            | Description                                                                                                     |
| ---------------- | --------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `modules`        | `readonly AnyTrackModule[]` | Required                           | Supplies at least one module. Use the same module set and versions registered in the application's track store. |
| `schema`         | `object`                    | `undefined`                        | Groups optional JSON Schema output settings.                                                                    |
| `schema.outFile` | `string`                    | `"trackSelectCatalog.schema.json"` | Sets the output path relative to the directory where you run the command. Missing directories are created.      |
| `schema.id`      | `string`                    | `undefined`                        | Adds a non-empty supplied value as the generated schema's `$id`.                                                |

The CLI looks only for `./trackselect.config.ts` in its current working directory; it does not search parent directories.

#### 2. Generate the schema

Run the package binary from the directory containing `trackselect.config.ts`:

```sh
pnpm exec trackselect schema
```

Use your package manager's equivalent when you do not use pnpm. The command prints the absolute path it wrote. Run it again whenever you add or remove a track module, update a module version, or change a module's config schema.

Consider committing the generated schema so editor support and validation do not depend on every contributor running the generator first.

#### 3. Connect a catalog to the schema

Set `$schema` in each catalog JSON file to a path relative to that catalog. For the file layout above, `catalogs/signals.json` starts with:

```json
{
  "$schema": "../schemas/trackSelectCatalog.schema.json",
  "id": "signals",
  "label": "Signal tracks",
  "views": [
    {
      "id": "all-signals",
      "label": "All signals",
      "columns": [{ "field": "title", "label": "Track" }],
      "grouping": [],
      "leaf": "title"
    }
  ],
  "tracks": [
    {
      "type": "bigwig",
      "id": "example-signal",
      "title": "Example signal",
      "config": { "url": "YOUR_URL_HERE" },
      "metadata": {}
    }
  ]
}
```

Your editor resolves that path from the JSON file, not from `trackselect.config.ts`. If the editor cannot load the schema, first check that the generated file exists and that the relative path is correct.

The generated file provides JSON-aware completion and validation; it does not turn a JSON import into a TypeScript value with a static `TrackSelectCatalog` type. Runtime parsing remains necessary.

#### 4. Keep runtime and editor validation aligned

The generator builds module-specific catalog entries from each module's `createInputSchema`. Use the same module set for:

- `createTrackStore({ modules })`
- `trackselect.config.ts`
- any programmatic `generateTrackCatalogJsonSchema` or `validateJson` calls

The generated schema validates JSON structure, allowed track types and displays, and the parts of module-specific track config represented in JSON Schema. Custom Zod refinements may remain runtime-only after conversion. `TrackSelect` also performs runtime validation for cross-field and multi-catalog rules, including metadata fields referenced across views, duplicate qualified track IDs across supplied catalogs, and selection IDs checked against the complete catalog list. Treat editor feedback as an early check, not a replacement for runtime parsing.

For build tooling that already owns a registry, generate the same schema programmatically:

```ts
import { generateTrackCatalogJsonSchema } from "@weng-lab/genomebrowser-ui";
import { bigWigModule, createModuleRegistry } from "@weng-lab/genomebrowser";

const registry = createModuleRegistry([bigWigModule]);
const schema = generateTrackCatalogJsonSchema(registry);
```

Use `validateJson(rawCatalog, registry)` when non-React code also needs the runtime parser. `TrackSelect` already calls it for every supplied catalog, so normal component integrations do not need to validate a second time.

## Accessibility

- TrackSelect renders a MUI modal dialog and inherits its focus management and Escape-key dismissal behavior. The host must close the controlled dialog when `onClose` runs.
- The close icon button has the accessible name `Close track select`. Clear, Reset, Cancel, Submit, and catalog navigation use text-labeled buttons.
- Removing a selected node uses an accessible name in the form `Remove {track label}`.
- Catalog selection and view controls use MUI X Data Grid Premium, MUI Select, and MUI X Tree View keyboard and focus behavior.
- Markers created by `withValueMarkers` are hidden from assistive technology; the formatted text remains available. If you replace `renderCell`, you are responsible for preserving an accessible text equivalent and keyboard behavior.
- MUI associates the visible `title` with the dialog as its accessible name. The view selector does not currently have a package-supplied accessible label, and TrackSelect does not expose a prop that lets the host provide one.

## Notes

### Selection and validation constraints

- `maxTracks` counts selected catalog entries across all supplied catalogs, not unrelated store tracks. Attempts to increase the draft past the limit open a limit dialog; removing selections remains possible.
- Catalog IDs must be unique in `trackCatalogs`, and track IDs must be unique within a catalog. The same authored track ID may appear in different catalogs because TrackSelect qualifies it with the catalog ID.
- TrackSelect validates catalogs against the registry before rendering dialog content. Unknown track types, unsupported properties, invalid module config, and missing view metadata fail validation.
- Use the same module set for the track store, JSON Schema generation, and standalone validation. A catalog generated for one registry can fail against another.
- Keep `trackCatalogs` stable. Recreating the array causes unchanged catalogs to be parsed again and can change initialization identity if catalog, view, or track IDs also change.

### Theme and licensing

TrackSelect uses the host application's MUI theme and needs no package-specific stylesheet or provider. It uses MUI X Premium components; the host must configure its own MUI X Premium license before rendering the component.

### Troubleshooting

**The catalog fails to open:** Read the `TrackSelect catalog is invalid` error. Confirm that every `type` is registered, every `config` matches its module, view fields exist in each track's metadata, and the catalog has no unsupported properties.

**A track cannot be selected:** Check the total catalog selection against `maxTracks`. The limit applies across catalogs, and a blocked increase opens the track-limit dialog.

**Submit shows an error:** Confirm that schema tooling and the application use the same modules and versions. Check that selected tracks still satisfy their modules and that the interaction resolver returns only supported callback functions.

**Submit order is unexpected:** Check the active view. Its grouping fields and the catalog's source order determine newly added track order; existing tracks retain their relative order.
