# TrackSelect

Use `TrackSelect` when users need to browse JSON-backed track catalogs and add or remove tracks from a `@weng-lab/genomebrowser-v2` track store.

`TrackSelect` is a track catalog adapter. It does not render tracks itself. It reads the registered modules and selected tracks from the provided track store hook, validates track catalogs against that registry, and writes track add/remove changes back to the same store.

## Minimal setup

```tsx
import { useState } from "react";
import { TrackSelect } from "@weng-lab/genomebrowser-ui-v2";
import { bigWigModule, createTrackStore } from "@weng-lab/genomebrowser-v2";

const useTrackStore = createTrackStore({
  modules: [bigWigModule],
});

const trackCatalogs = [
  {
    id: "signals",
    label: "Signals",
    views: [
      {
        id: "default",
        label: "Default",
        columns: [{ field: "assay", label: "Assay" }],
        leaf: "title",
      },
    ],
    tracks: [
      {
        type: "bigwig",
        config: {
          id: "signal",
          title: "Signal",
          url: "YOUR_URL_HERE",
        },
        metadata: {
          assay: "Example assay",
        },
      },
    ],
  },
];

export function TrackSelectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Choose tracks</button>
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

## Track catalog mental model

A track catalog contains display views followed by track entries. Views define how TrackSelect presents the catalog. Track entries define the tracks that can be added to the browser.

## Track catalog JSON shape

```json
{
  "$schema": "./trackSelectCatalog.schema.json",
  "id": "signals",
  "label": "Signals",
  "description": "Signal tracks",
  "views": [
    {
      "id": "default",
      "label": "Default",
      "columns": [
        { "field": "assay", "label": "Assay" },
        { "field": "biosample", "label": "Biosample" }
      ],
      "grouping": ["assay"],
      "leaf": "title"
    }
  ],
  "tracks": [
    {
      "type": "bigwig",
      "config": {
        "id": "signal",
        "title": "Signal",
        "url": "YOUR_URL_HERE"
      },
      "metadata": {
        "assay": "Example assay",
        "biosample": "Example cell type"
      }
    }
  ]
}
```

## Views

Views define how TrackSelect presents the same tracks:

- `columns` lists fields to show
- `grouping` groups rows by fields and defaults to `[]`
- `leaf` chooses the final item label and defaults to `"title"`

Fields `id`, `title`, and `type` are built in. Other fields referenced by `columns`, `grouping`, or `leaf` must exist in every track's `metadata`.

Metadata values can be strings, numbers, booleans, or `null`.

## Track entries

Each track entry has:

- `type`: the registered track module type, such as `"bigwig"`
- `config`: the flat create input accepted by that module's `create(...)` function
- `metadata`: optional values used by TrackSelect views for columns, grouping, and labels

For example:

```json
{
  "type": "bigwig",
  "config": {
    "id": "signal",
    "title": "Signal",
    "url": "YOUR_URL_HERE",
    "height": 80
  },
  "metadata": {
    "assay": "Example assay",
    "biosample": "Example cell type"
  }
}
```

The `type` field selects the registered module. `config` is then validated with that module's create-input schema before the track can be added.

## Generating a JSON Schema

Use `generateTrackCatalogJsonSchema` when you want editor autocomplete or validation for track catalog JSON.

```ts
import { generateTrackCatalogJsonSchema } from "@weng-lab/genomebrowser-ui-v2";
import { bigWigModule } from "@weng-lab/genomebrowser-v2";

const schema = generateTrackCatalogJsonSchema([bigWigModule]);
```

The generated schema includes the allowed `type` values and the matching `config` shape for each module passed in. Pass at least one module; schema generation throws if the module list is empty.

## Validating catalog JSON

Use `validateJson` if you want to validate a track catalog before rendering `TrackSelect`.

```ts
import { validateJson } from "@weng-lab/genomebrowser-ui-v2";
import { bigWigModule } from "@weng-lab/genomebrowser-v2";

const catalog = validateJson(rawCatalog, [bigWigModule]);
```

You can pass either a module array or the registry from a v2 track store. If a track references an unknown `type`, or its `config` does not match that module's create-input schema, validation fails.

`TrackSelect` calls `validateJson` for each track catalog with the registry from `useTrackStore`, so the rendered dialog uses the same module set as the browser.

## Props

- `open`: whether the dialog is visible
- `onClose`: called when the dialog should close
- `trackCatalogs`: track catalogs to show
- `useTrackStore`: v2 track store hook created by `createTrackStore`
- `title`: dialog title, defaults to `"Track Select"`
- `maxTracks`: maximum selected tracks, defaults to `50`

## Defaults

The dialog opens directly to the catalog detail screen when there is only one track catalog. With multiple track catalogs, it opens to the catalog list.

## Sharp edges

Track catalog IDs must be unique. Track IDs must be unique within a track catalog; the same track ID can appear in another catalog because TrackSelect qualifies it with the catalog ID.

The modules used to generate or pre-validate catalog JSON must match the modules registered in the track store. If a JSON Schema was generated with one module set but the UI store uses another, catalog entries may validate in tooling but fail in the app.

`trackCatalogs` is parsed during render. Keep the array stable when possible so TrackSelect does not re-validate unchanged catalog data on unrelated renders.

`useTrackStore` is named with a `use` prefix because the store returned by `createTrackStore` is a Zustand hook. Keep that naming pattern for local store variables.
