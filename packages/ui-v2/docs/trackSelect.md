# TrackSelect

Use `TrackSelect` to let users browse track catalogs and update the tracks shown by a v2 `GenomeBrowser`. It is a controlled dialog and a catalog adapter, not a track renderer: the host owns whether it is open, and a shared v2 track store owns committed tracks.

Start with the integration in [Getting started](gettingStarted.md). The recommended public surface is small:

- `TrackSelect` for the dialog
- `withValueMarkers` when catalog values need simple color markers
- the `trackselect schema` command for catalog authoring
- `validateJson` or `generateTrackCatalogJsonSchema` only when an application needs programmatic tooling

## Dialog lifecycle

Pass a stable `trackCatalogs` array and the same `useTrackStore` hook used by `GenomeBrowser`. The host controls `open` and closes the dialog in `onClose`.

Use `defaultTrackIds` to immediately initialize the catalog-owned part of the track store. The array contains catalog-qualified IDs in browser order:

```tsx
<TrackSelect
  open={open}
  onClose={onClose}
  trackCatalogs={trackCatalogs}
  useTrackStore={useTrackStore}
  defaultTrackIds={["genes::gencode", "signals::example-signal"]} // catalogId::trackId
/>
```

TrackSelect preserves non-catalog tracks first in their existing order, then places the default tracks in the exact supplied order. Passing `undefined` leaves the initial store unchanged; passing `[]` removes all tracks represented by the supplied catalogs. Defaults are reapplied when TrackSelect mounts or when the list changes by value, but not after ordinary store updates.

Each open session starts with a draft selection. Browsing, selecting, Clear, and Reset edit that draft without changing the track store.

- **Clear** asks for confirmation, then clears the active catalog on its detail screen or all catalogs on the catalog-list screen.
- **Reset** asks for confirmation, then restores `defaultTrackIds` in their supplied order. Without `defaultTrackIds`, it restores the catalog tracks currently committed in the store.
- **Cancel**, the close button, and normal dialog dismissal discard the draft and call `onClose`.
- **Submit** computes additions and removals for catalog tracks, creates additions through the track-store registry, and applies the changes as one store update. Tracks not represented by the supplied catalogs are preserved.

After a successful Submit, TrackSelect calls `onClose`. If track creation or the store update fails, the store remains unchanged and the dialog stays open with an error.

With one catalog, the dialog opens on its detail screen. With multiple catalogs, it opens on the catalog list. `title` defaults to `"Track Select"`.

## Catalogs and views

A catalog names a collection of available track entries and defines one or more views over them. A view controls visible data, row grouping, and selected-track labels; it does not change the underlying track definitions.

```json
{
  "$schema": "./trackSelectCatalog.schema.json",
  "id": "signals",
  "label": "Signal tracks",
  "description": "Example assay signals",
  "views": [
    {
      "id": "by-assay",
      "label": "By assay",
      "columns": [
        { "field": "assay", "label": "Assay" },
        { "field": "biosample", "label": "Biosample", "width": 220 }
      ],
      "grouping": ["assay"],
      "leaf": "title"
    }
  ],
  "tracks": [
    {
      "type": "bigwig",
      "id": "example-signal",
      "title": "Example signal",
      "height": 80,
      "config": {
        "url": "YOUR_URL_HERE"
      },
      "metadata": {
        "assay": "ATAC-seq",
        "biosample": "Example biosample"
      }
    }
  ]
}
```

Catalog and view IDs should be stable and unique in their scopes. Catalog IDs must be unique in the `trackCatalogs` array, and track IDs must be unique within a catalog. A track ID may be reused in another catalog because TrackSelect namespaces track identity across catalogs.

The public catalog-qualified ID format is `${catalogId}::${trackId}`. Use these IDs for `defaultTrackIds`; for example, track `example-signal` in catalog `signals` is `signals::example-signal`. Duplicate IDs, unknown IDs, and default lists longer than `maxTracks` are rejected.

TrackSelect treats any store track whose ID matches an entry in the supplied catalogs as catalog-owned. Give fixed or otherwise non-catalog tracks IDs outside this reserved catalog-qualified set.

Each view requires at least one column:

- `columns` contains a `field` and optional `label`, `description`, `width`, or `hidden` presentation values.
- `grouping` lists metadata or built-in fields from outermost to innermost group and defaults to `[]`.
- `leaf` selects the final item label and defaults to `"title"`.

The built-in fields are `id`, `title`, and `type`. Any other field referenced by `columns`, `grouping`, or `leaf` must exist in every track's `metadata`. Metadata values may be strings, numbers, booleans, or `null`. Do not use metadata keys named `id`, `title`, or `type`; built-in row values take precedence.

The active view also determines the order of newly added tracks. Groups follow their first appearance in catalog order, nested groups follow the `grouping` field order, and tracks within the final group retain catalog order. Switching views can therefore change insertion order on Submit.

## Registry validation

Each catalog track combines browser create fields with module-owned config:

- `type` selects a module registered in the track store.
- `id`, `title`, `display`, `height`, and `color` are v2 browser create fields.
- `config` must match the selected module's create-input schema.
- `metadata` exists only for TrackSelect views and is not copied into the runtime track instance.

TrackSelect validates every catalog with the registry read from `useTrackStore`. Unknown track types, invalid module config, missing view metadata, and unknown catalog properties fail before the dialog content renders. Module defaults are applied when a selected track is created during default initialization or submission, not retained as authored catalog data during validation.

Use the same module set for the track store, JSON Schema generation, and any separate `validateJson` call. A catalog generated against one registry can fail in an application that registers another.

## Selection limit

`maxTracks` limits the total draft selection across all supplied catalogs and defaults to `50`. A selection that would increase the draft beyond the limit is rejected and opens a limit dialog. Removing selections remains possible when the draft is already at the limit.

The limit counts TrackSelect catalog entries, not unrelated tracks already in the store.

## Columns, markers, and theme

Keep portable labels, descriptions, widths, and hidden defaults in catalog JSON. Use `columnOverrides` for host-only MUI Data Grid behavior. Overrides are scoped first by catalog ID and then by field and apply to every view in that catalog.

```tsx
import { TrackSelect, withValueMarkers } from "@weng-lab/genomebrowser-ui-v2";

<TrackSelect
  open={open}
  onClose={onClose}
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

An override is shallowly merged into the generated MUI `GridColDef`. Supplying `width` disables the generated flexible width unless the override also supplies `flex`; supplying `renderCell` replaces TrackSelect's normal truncating, tooltip-enabled cell renderer. Unknown catalog IDs and fields are ignored.

`withValueMarkers` adds a square marker to configured formatted values and preserves the normal value cell for everything else. MUI Data Grid owns grouping, expansion, filtering, and other grid behavior, so renderers may also appear in generated grouping cells.

TrackSelect uses the host application's normal MUI setup and theme. No package-specific stylesheet or provider is required.

## Generate a catalog schema

Generate JSON Schema from the same modules used by the track store so editors can autocomplete catalog entries and catch invalid module config.

Create `trackselect.config.ts` beside the catalogs:

```ts
import { defineTrackSelectConfig } from "@weng-lab/genomebrowser-ui-v2/cli";
import { bigWigModule } from "@weng-lab/genomebrowser-v2";

export default defineTrackSelectConfig({
  modules: [bigWigModule],
  schema: {
    outFile: "schemas/trackSelectCatalog.schema.json",
  },
});
```

Run the command from that directory:

```sh
trackselect schema
```

Without `schema.outFile`, the command writes `./trackSelectCatalog.schema.json`. It requires at least one module. Point a catalog's `$schema` field at the generated file.

For build tooling that already has a registry, generate the same schema programmatically:

```ts
import { generateTrackCatalogJsonSchema } from "@weng-lab/genomebrowser-ui-v2";
import { bigWigModule, createModuleRegistry } from "@weng-lab/genomebrowser-v2";

const registry = createModuleRegistry([bigWigModule]);
const schema = generateTrackCatalogJsonSchema(registry);
```

Use `validateJson(rawCatalog, registry)` when non-React code needs the runtime validator directly. TrackSelect already performs this validation, so most component integrations do not need a separate call.

## Troubleshooting

### The catalog fails to open

Read the `TrackSelect catalog is invalid` error path. Confirm that every `type` is registered, every nested `config` matches its module, view fields exist in each track's metadata, and the catalog contains no unsupported properties. Keep `trackCatalogs` stable so unchanged catalogs are not repeatedly parsed on unrelated renders.

### A track cannot be selected

Check the total selection against `maxTracks`. The limit applies across catalogs, and a blocked increase opens the track-limit dialog.

### Submit shows an error

Confirm that schema tooling and the application use the same modules and versions. Also check for an ID collision with an existing store track. TrackSelect namespaces IDs across catalogs for uniqueness, but the final store still requires every track ID to be unique.

### Submit order is unexpected

Check the active view. Its grouping fields and the catalog's source order determine the order of newly added tracks; existing tracks keep their current relative order.
