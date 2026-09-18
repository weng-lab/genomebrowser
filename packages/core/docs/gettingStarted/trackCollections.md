# Use track collections

A collection groups configured tracks for an assembly into a reusable catalog. It contains the module types, data sources, and display options needed to create those tracks, so the same collection can be shared across applications or loaded into different browsers. Core provides the collection format, validation, and JSON schema tooling. The application decides which entries to add to its track store.

`TrackSelect` from `@weng-lab/genomebrowser-ui` is the recommended way to let users browse a collection and choose tracks. Applications can also load tracks directly from collections, using their own selection logic or a predefined list.

This chapter builds on [Add and configure tracks](configureTracks.md), moving the two hg38 signal tracks into a collection. Both loading paths use the existing browser store and registered modules.

## Define a collection

Collection entries contain the same `base` and `config` inputs used when creating tracks, together with a `type` that selects their module. Listing a track in a collection does not add it to the browser or load its data. A collection can therefore describe a large catalog while the browser loads only the tracks added to its store.

Create `trackCollections.ts` with the two BigWig tracks from the track-configuration chapter. The `TrackCollection<typeof trackModules>` type checks entries against the application's module set. The optional `views` field describes how a catalog UI should present the entries. This example provides a title column; larger collections can add scalar metadata and views that group entries by those fields.

```ts
import type { TrackCollection } from "@weng-lab/genomebrowser";
import { trackModules } from "./browserState";

export const trackCollections = [
  {
    id: "signals",
    label: "Signal tracks",
    assembly: "hg38",
    views: [
      {
        id: "all",
        label: "All signals",
        columns: [{ field: "title", label: "Track" }],
      },
    ],
    tracks: [
      {
        type: "bigwig",
        base: { id: "signal", title: "Signal", color: "#2266aa" },
        config: { url: "YOUR_URL_HERE" },
      },
      {
        type: "bigwig",
        base: { id: "comparison", title: "Comparison", color: "#a34b80" },
        config: { url: "YOUR_URL_HERE" },
      },
    ],
  },
] satisfies TrackCollection<typeof trackModules>[];
```

Replace the URLs with hg38 BigWig files. The collection's `assembly` is an identifier, not an assembly definition or an automatic filter. The application must supply catalogs that match the active browser.

## Share collection files

Collections can be authored in TypeScript, as above, or distributed as JSON files. A receiving application must register modules for the collection's track types and provide a browser with the matching assembly. The collection supplies track configuration; module implementations and runtime callbacks remain in application code.

For JSON authoring, generate an editor schema from the module array with the [schema CLI](../reference/collectionsAndSchemas/schemaCli.md) and reference it through the collection's `$schema` field. Regenerate the schema when module schemas change. This gives editors module-specific completion and validation while keeping the collection portable. Validate imported or downloaded data at runtime before creating tracks.

## Prepare the track store

Replace the initial track store in `browserState.ts` with the following definition. Keep `trackModules` registered as before, but remove the directly created `signal` and `comparison` instances. The collection will supply those tracks through either of the loading paths below.

```ts
export const useTrackStore = createTrackStore({
  modules: trackModules,
  pinnedTrackIds: ["ruler"],
  tracks: [
    rulerModule.create({
      base: { id: "ruler", title: "Coordinates" },
      config: {},
    }),
  ],
});
```

## Load tracks directly

To use a collection in application code, validate its entries against the store's registered modules, create the desired tracks, and pass them to a track-store action. `validateTrackCollection` checks the collection and throws if it is invalid; it does not create runtime tracks or change the browser.

The following initialization code runs outside React. It loads both signal entries and replaces the track list while preserving the ruler. For a JSON file, pass the parsed JSON value in place of `trackCollections[0]`. An application with its own selection logic can filter `collection.tracks` before creating instances.

```ts
import { validateTrackCollection, type AnyTrackModule } from "@weng-lab/genomebrowser";
import { useTrackStore } from "./browserState";
import { trackCollections } from "./trackCollections";

const store = useTrackStore.getState();
const collection = validateTrackCollection(trackCollections[0], store.registry.modules);
const ruler = store.getTrack("ruler");
const tracks = collection.tracks.map(({ type, base, config }) => {
  const module: AnyTrackModule = store.registry.get(type);
  return module.create({ base, config, source: "host" });
});
const result = store.setTracks([...(ruler ? [ruler] : []), ...tracks]);
if (!result.ok) throw new Error(result.error);
```

Direct loading keeps the track IDs from the collection, `signal` and `comparison`. When combining collections, the application must assign unique runtime IDs. The example sets `source: "host"` because the application supplies the data sources; first-party settings then allow display changes while disabling source URL edits.

## Choose tracks with TrackSelect

TrackSelect handles collection validation, selected-track creation, and selection updates. Use this path as an alternative to the direct initialization above. Start with the ruler-only store and let the picker establish the initial selection.

### Install the selection UI

If the UI dependencies were installed for the browser controls, no additional installation is needed. Otherwise, add the UI package and its remaining peers to the packages from the first chapter:

```sh
pnpm add @weng-lab/genomebrowser-ui@2.0.0 @mui/icons-material@7 @mui/x-data-grid-premium@8 @mui/x-license@8 @mui/x-tree-view@8
```

TrackSelect uses MUI X Premium for its grid. Applications using it need to account for MUI X licensing; the package does not configure a license key on the application's behalf.

TrackSelect identifies a catalog track by combining its collection ID and track ID. The `signal` entry above becomes `signals::signal` in the runtime store. This allows different collections to reuse a track ID without creating conflicting IDs in the store.

Non-collection tracks survive selection changes, so the ruler stays in the browser even when all catalog tracks are deselected. Collection-created tracks use `source: "host"`.

### Open the picker and establish defaults

The application owns whether the dialog is open. TrackSelect owns the draft inside it and commits that draft through the same `useTrackStore` passed to `GenomeBrowser`. Closing or cancelling the dialog discards draft changes; Submit applies the accepted selection and then calls `onClose`.

Create `TrackPicker.tsx` with a default selection of the first signal. Initialization runs while TrackSelect is mounted, even when the dialog is closed, so keep the component mounted and control its `open` prop. The default selection adds the initial signal track and determines which tracks the dialog selects on Reset.

```tsx
import { useState } from "react";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";
import { useTrackStore } from "./browserState";
import { trackCollections } from "./trackCollections";

const defaultTrackIds = ["signals::signal"];

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
        defaultTrackIds={defaultTrackIds}
      />
    </>
  );
}
```

Import `TrackPicker` from `./TrackPicker` and add `<TrackPicker />` beside the controls in `App.tsx`. The browser now starts with the ruler and signal track. Opening the dialog, selecting Comparison, and submitting adds the second signal row. The picker preserves settings on selected tracks that already exist in the store.

Application controls targeting catalog rows must use their qualified IDs as well. If retaining `SignalControls` from the track-configuration chapter, change its target IDs to `signals::signal` and `signals::comparison`; the comparison row may now be absent until selected.

### Restore and save selections

To restore a saved selection, pass its collection-qualified IDs through `initialTrackIds`. These take precedence over `defaultTrackIds` during initialization. Load the initial IDs once and keep them stable for the mounted picker. An empty array deliberately starts with no catalog tracks.

`defaultTrackIds` continues to define the dialog's Reset target, even when `initialTrackIds` supplies the starting selection.

Use `onCommittedTrackIds` to save the ordered collection IDs after a successful Submit. The callback excludes non-collection tracks. It does not run for initialization, Cancel, Reset draft actions, or changes made through other controls.

The callback records track choices and order. Saving edited settings or other browser state requires an application-owned session format.

## Further reading

- [Collections and schemas](../reference/collectionsAndSchemas/README.md): catalog fields, metadata, validation, and editor tooling.
- [State and browser lifetime](../guides/stateAndLifetime.md): initialization, shared views, and state ownership.
- [Create a custom track](../guides/customTracks.md): defining additional module types for the same registry.
