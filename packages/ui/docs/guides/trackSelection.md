# Choose tracks from collections

`TrackSelect` lets users browse collections and submit a selection to the browser's track store. A collection describes available tracks, their metadata, and optional views for grouping and displaying them. The application supplies the collections and registers the modules that create their tracks.

Complete [installation and MUI X license setup](../../README.md#install) first. This example also requires `@weng-lab/genomebrowser-tracks` and a browser-accessible hg38 BigWig file.

## Define the collection

Create `collections.ts` with a stable collection array. Replace `YOUR_URL_HERE` with your file URL. The `assay` metadata supplies both a grid column and a grouping field; `leaf: "title"` labels individual tracks.

```ts
import type { TrackCollection } from "@weng-lab/genomebrowser";

export const trackCollections = [
  {
    assembly: "hg38",
    id: "signals",
    label: "Signal tracks",
    views: [
      {
        id: "by-assay",
        label: "By assay",
        columns: [{ field: "assay", label: "Assay" }],
        grouping: ["assay"],
        leaf: "title",
      },
    ],
    tracks: [
      {
        base: { id: "accessibility", title: "Accessibility signal" },
        type: "bigwig",
        config: { url: "YOUR_URL_HERE" },
        metadata: { assay: "ATAC-seq" },
      },
    ],
  },
] satisfies TrackCollection[];

export const defaultTrackIds = ["signals::accessibility"];
```

The track ID is `accessibility` within the `signals` collection. TrackSelect combines these IDs as `signals::accessibility` in the runtime store. Use this qualified form for initial selections, defaults, and saved selections. Reserve those IDs for the picker; give fixed tracks separate IDs such as `ruler`.

JSON collections use the same data format. Load and validate collection data with the registered modules before offering it to users. TrackSelect also validates its input at runtime. It displays the collection's assembly name but does not change or check the browser assembly, so the application must supply collections appropriate for the active assembly.

## Connect the picker

Create `BrowserWithTracks.tsx` beside `collections.ts`. Register every module used in the collection. The ruler below stays in the browser independently of the picker because its ID does not belong to a collection.

```tsx
import { useState } from "react";
import Button from "@mui/material/Button";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";
import { trackCollections, defaultTrackIds } from "./collections";

export function BrowserWithTracks() {
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [rulerModule, bigWigModule],
      tracks: [rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} })],
    }),
  );
  const [open, setOpen] = useState(false);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <Button onClick={() => setOpen(true)}>Choose tracks</Button>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
        defaultTrackIds={defaultTrackIds}
      />
    </div>
  );
}
```

The signal appears during initialization even though the dialog starts closed. Keep TrackSelect mounted and change `open` to show or hide it. Mounting it only when the user opens the dialog delays initialization and reapplies the initial selection on each remount.

## Work with the draft

Opening the picker starts a draft from the current collection tracks. With one collection, it opens directly on the tracks; multiple collections first show a collection list. Selecting a group selects its selectable descendant tracks.

Submit applies the draft to the shared store. Cancel or dismissal discards it. Clear and Reset also operate on the draft and require Submit to affect the browser. Clear targets the active collection on a detail screen or all collections on the list screen. Reset restores `defaultTrackIds` in their supplied order, or clears collection selections if defaults are absent.

The default limit is 50 selected collection tracks across all supplied collections. Set `maxTracks` to change it. Tracks outside the collections do not count toward that limit and survive collection selection changes.

Collection tracks use `source: "host"`. First-party settings disable their source URL inputs while allowing other settings, such as title and color, to remain editable.

## Restore and save a selection

Use `initialTrackIds` for a restored selection and keep recommended tracks in `defaultTrackIds`. An explicit initial list takes precedence during initialization; Reset still returns to the defaults. An empty list means no collection tracks. An absent list lets defaults apply, and omitting both props preserves the initial store.

Once the application has loaded its saved IDs into `savedTrackIds`, add `initialTrackIds` and `onCommittedTrackIds` to the existing picker. This example saves submitted IDs to local storage:

```tsx
<TrackSelect
  open={open}
  onClose={() => setOpen(false)}
  trackCollections={trackCollections}
  useTrackStore={useTrackStore}
  initialTrackIds={savedTrackIds}
  defaultTrackIds={defaultTrackIds}
  onCommittedTrackIds={(ids) => {
    localStorage.setItem("hg38.selectedTracks", JSON.stringify(ids));
  }}
/>
```

Load and parse saved IDs through the application's storage code before mounting the picker. Check that they are unique, belong to the current collections, and fit within `maxTracks`; use `undefined` to fall back to defaults when saved data is unavailable or invalid. Keep that initial list unchanged while the picker is mounted, because changing it can reapply the selection.

Handle storage failures through the application's error reporting. A failed save does not undo the submitted tracks.

`onCommittedTrackIds` reports the complete ordered collection selection after a successful Submit. It does not report initialization, canceled drafts, or changes made directly to the track store. Saving these IDs restores membership and order, not modified track settings or browser position. Keep storage keys scoped to the assembly and collection set used by the application.

## Customize views and columns

Put data fields and grouping in collection views. Omitting views gives a simple title view. Multiple views let users choose different groupings; the active view determines insertion order for newly selected tracks. Existing tracks retain their relative order.

Keep application rendering code in `columnOverrides`. For the collection above, define an override beside the imports and pass it as `columnOverrides={columnOverrides}`:

```ts
import { withValueMarkers, type TrackSelectColumnOverrides } from "@weng-lab/genomebrowser-ui";

const columnOverrides: TrackSelectColumnOverrides = {
  signals: {
    assay: withValueMarkers({ "ATAC-seq": "#02c7b9" }),
  },
};
```

The marker supplements the visible assay text. Overrides customize fields already present in the view; they do not add collection fields. See [column customization](../reference/trackSelection/columnCustomization.md) for sizing and custom cell rendering.

## Further reading

[Handle collection track interactions](trackInteractions.md) attaches application behavior to selected tracks. The [TrackSelect reference](../reference/trackSelection/TrackSelect.md) explains when initial selections are applied and specifies ordering, callbacks, and validation. [Troubleshooting](../troubleshooting.md) covers rejected collections and unexpected selection changes.
