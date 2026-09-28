# TrackSortDialog

`TrackSortDialog` reorders tracks by application metadata, such as sample ID or assay. People choose which sort options to use and drag them into priority order; the top option sorts first and each option below it breaks ties. Pass the same track store instance used by `GenomeBrowser`.

## Usage

```tsx
import { useState } from "react";
import {
  GenomeBrowser,
  createBrowserStore,
  createTrackStore,
  hg38,
  type AnyTrackInstance,
} from "@weng-lab/genomebrowser";
import { TrackSortDialog, type TrackSortOption } from "@weng-lab/genomebrowser-ui";

type SampleInfo = { sampleId: string; assay: string };

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
});

const useTrackStore = createTrackStore({ modules: [] });

// The application records metadata for each track it adds, keyed by track ID.
const sampleInfoByTrackId = new Map<string, SampleInfo>();

const sortOptions: TrackSortOption<SampleInfo>[] = [
  { id: "sample", label: "Sample ID", compare: (a, b) => a.sampleId.localeCompare(b.sampleId) },
  { id: "assay", label: "Assay", compare: (a, b) => a.assay.localeCompare(b.assay) },
];

function getSampleInfo(track: AnyTrackInstance) {
  return sampleInfoByTrackId.get(track.base.id);
}

export function BrowserWithTrackSorting() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Sort tracks
      </button>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <TrackSortDialog
        trackStore={useTrackStore}
        open={open}
        onClose={() => setOpen(false)}
        options={sortOptions}
        getMetadata={getSampleInfo}
      />
    </>
  );
}
```

`ControlToolbar` and `ManagementControls` provide a Sort button through `onSortTracks`, so `onSortTracks={() => setOpen(true)}` can replace the button above.

## Examples

### Choose which tracks are sorted

`getMetadata` decides which tracks participate. Return the values the options compare, or `undefined` to leave a track where it is. For example, sort only the tracks your application added from one collection by returning metadata for their IDs and `undefined` for everything else. Pinned tracks always keep their positions.

Sorted tracks are rearranged among the positions they already occupy. If an unsorted gene track sits between two sorted tracks, it stays in that row and the sorted tracks move around it.

### Compare by a custom order

Each `compare` works like an `Array.prototype.sort` comparator: return a negative number when `a` belongs above `b`, a positive number when it belongs below, and `0` on a tie. To sort by a fixed order instead of alphabetically, compare ranks:

```ts
const assayRank = new Map([
  ["ATAC", 0],
  ["RNA", 1],
  ["WGBS", 2],
]);

const byAssay: TrackSortOption<SampleInfo> = {
  id: "assay",
  label: "Assay",
  compare: (a, b) =>
    (assayRank.get(a.assay) ?? Number.MAX_SAFE_INTEGER) -
    (assayRank.get(b.assay) ?? Number.MAX_SAFE_INTEGER),
};
```

A comparator can also combine fields, such as ordering by assay and then by a file's position within that assay.

## API

### TrackSortDialogProps

`TrackSortDialogProps<Metadata>` is exported from the package root. `Metadata` is the type your options compare.

| Prop          | Type                                                 | Default         | Description                                                                                                |
| ------------- | ---------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `trackStore`  | `TrackStoreInstance`                                 | Required        | Track store whose tracks are read and reordered when the sort is applied.                                  |
| `open`        | `boolean`                                            | Required        | Whether the dialog is open.                                                                                |
| `onClose`     | `() => void`                                         | Required        | Called after the sort is applied and when the user cancels or requests that the dialog close.              |
| `options`     | `readonly TrackSortOption<Metadata>[]`               | Required        | Sort options. Until a sort is applied, every option is included in this priority order.                    |
| `getMetadata` | `(track: AnyTrackInstance) => Metadata \| undefined` | Required        | Returns the metadata the options compare for a track. Tracks that return `undefined` keep their positions. |
| `title`       | `string`                                             | `"Sort Tracks"` | Dialog heading.                                                                                            |

### TrackSortOption

`TrackSortOption<Metadata>` is exported from the package root.

| Field     | Type                                   | Description                                                                                                        |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`      | `string`                               | Identifies the option. Must be unique among the dialog's options; the dialog remembers the applied priority by ID. |
| `label`   | `string`                               | Text shown on the option's chip or in the Add sort option list, and in the priority list.                          |
| `compare` | `(a: Metadata, b: Metadata) => number` | Returns a negative number when `a` belongs above `b`, a positive number when it belongs below, or `0` on a tie.    |

## Behavior

With five or fewer options, each option appears as a chip. Clicking an included chip leaves that option out of the sort; clicking it again adds it back at the bottom of the priority list as the lowest tiebreaker.

With more than five options, chips would wrap onto several lines, so an "Add sort option" search field replaces them. It lists only the excluded options, and picking one adds it at the bottom of the priority list. Each priority row then has a remove button that excludes its option.

The priority list shows only included options, labeling the top one "Primary sort" and the rest "Tiebreaker". Dragging a row stays within the list. When no options are included, Apply keeps the current track order.

**Apply order** reads the store's current tracks, reorders them with `reorderTracks`, and calls `onClose`. Tracks that tie on every included option keep their current relative order. Sorting runs once per Apply; tracks added later are not sorted until the next Apply.

The dialog remembers the last applied priority while it stays mounted, and each opening starts from it. **Cancel**, the close button, Escape, and clicking outside the dialog call `onClose` and discard unapplied changes. An option added to `options` after the dialog mounts starts excluded. Escape during a move cancels the move and leaves the dialog open.

## Accessibility

The dialog uses MUI's modal focus and keyboard behavior, and the close button is named "Close track sorting". Option chips are buttons whose `aria-pressed` state reports whether the option is included; excluded chips also use an outlined, struck-through style so state does not depend on color alone. With more than five options, the "Add sort option" field is a labeled combobox, and each row's remove button is named "Remove" followed by the option label. Rows in the "Sort priority" list are focusable. Press Space or Enter to pick up a row, the arrow keys to move it, Space or Enter to drop it, and Escape to cancel the move.

## Related reference

[Back to track sorting](README.md) · [ControlToolbar](../01-browserControls/ControlToolbar.md) · [UI API reference](../README.md)
