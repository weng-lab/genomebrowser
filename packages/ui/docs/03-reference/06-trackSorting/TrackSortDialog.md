# TrackSortDialog

`TrackSortDialog` reorders tracks by fields such as sample ID or assay. People choose which sort options to use and drag them into priority order; the top option sorts first and each option below it breaks ties. Pass the same track store instance used by `GenomeBrowser`.

## Usage

```tsx
import { useState } from "react";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { TrackSortDialog, type TrackSortOption } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
});

const useTrackStore = createTrackStore({ modules: [] });

// Each option reads a field the application set when adding the track, such as
// metadata: { "Sample ID": "S12", Assay: "ChIP-seq" }.
const sortOptions: TrackSortOption[] = [
  { id: "sample", label: "Sample ID", value: (track) => track.metadata?.["Sample ID"] },
  { id: "assay", label: "Assay", value: (track) => track.metadata?.Assay },
];

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
      />
    </>
  );
}
```

`ControlToolbar` and `ManagementControls` provide a **Sort tracks** icon button through `onSortTracks`, so `onSortTracks={() => setOpen(true)}` can replace the button above.

## Examples

### How values order

Each option's `value` reads one value from a track: text, a number, `true` or `false`, or `null` or `undefined` when the track has none. Values order by type:

- Numbers in numeric order.
- Text in natural order, ignoring case, so "rep2" comes before "rep10".
- `false` before `true`.

When one option returns values of different types, numbers come first, then text, then `true` and `false`. Tracks without a value go after the tracks with one, in their current order, in either direction.

Every unpinned track takes part in a sort. Sorted tracks are rearranged among the positions they already occupy, so a pinned track stays in its row and the others move around it.

### Read values from your own data

`value` can read anything about a track, not only its metadata. To sort by details your application keeps elsewhere, look them up by track ID:

```ts
const donors = new Map([["h3k27ac-k562", "D3"]]);

const byDonor: TrackSortOption = {
  id: "donor",
  label: "Donor",
  value: (track) => donors.get(track.base.id),
};
```

### Sort by a fixed order

To sort by a fixed order instead of alphabetically, return each value's rank. Numbers sort numerically, and a value without a rank sorts last:

```ts
const assayRank = new Map([
  ["ATAC", 0],
  ["RNA", 1],
  ["WGBS", 2],
]);

const byAssay: TrackSortOption = {
  id: "assay",
  label: "Assay",
  value: (track) => {
    const assay = track.metadata?.Assay;
    return typeof assay === "string" ? assayRank.get(assay) : undefined;
  },
};
```

## API

### TrackSortDialogProps

`TrackSortDialogProps` is exported from the package root.

| Prop         | Type                         | Default         | Description                                                                                   |
| ------------ | ---------------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `trackStore` | `TrackStoreInstance`         | Required        | Track store whose tracks are read and reordered when the sort is applied.                     |
| `open`       | `boolean`                    | Required        | Whether the dialog is open.                                                                   |
| `onClose`    | `() => void`                 | Required        | Called after the sort is applied and when the user cancels or requests that the dialog close. |
| `options`    | `readonly TrackSortOption[]` | Required        | Sort options. Until a sort is applied, every option is included in this priority order.       |
| `title`      | `string`                     | `"Sort Tracks"` | Dialog heading.                                                                               |

### TrackSortOption

`TrackSortOption` is exported from the package root.

| Field   | Type                                          | Description                                                                                                        |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`    | `string`                                      | Identifies the option. Must be unique among the dialog's options; the dialog remembers the applied priority by ID. |
| `label` | `string`                                      | Text shown on the option's chip or in the Add sort option list, and in the priority list.                          |
| `value` | `(track: AnyTrackInstance) => TrackSortValue` | Reads the value this option sorts a track by. See [How values order](#how-values-order).                           |

### TrackSortValue

`TrackSortValue` is exported from the package root. It's `string`, `number`, `boolean`, `null`, or `undefined`; `null` and `undefined` mean the track has no value, and it sorts last.

### applyTrackSort

`applyTrackSort(trackStore, rules)` sorts the store's tracks once, as the dialog's **Apply order** does, and commits the order with `reorderTracks`. Use it to sort from somewhere other than the dialog, such as an agent command, so both give the same order.

```ts
import { applyTrackSort } from "@weng-lab/genomebrowser-ui";

const result = applyTrackSort(trackStore, [
  { option: byAssay, direction: "ascending" },
  { option: byDonor, direction: "descending" },
]);
```

The first rule orders the tracks, and each later rule breaks ties left by the rules before it, in its own direction. Tracks without a value for a rule go after the tracks with one in either direction, and tracks that tie on every rule keep their current order. Pinned tracks keep their positions. The store's tracks are read when the function runs; tracks added later are not sorted until the next call. Returns `reorderTracks`' [mutation result](https://github.com/weng-lab/genomebrowser/blob/main/packages/core/docs/03-reference/01-browserSetup/trackStore.md#mutation-results).

### TrackSortRule and TrackSortDirection

`TrackSortRule` and `TrackSortDirection` are exported from the package root. A rule is one level of a sort.

| Field       | Type                                                  | Description                                                                                                                    |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `option`    | `TrackSortOption`                                     | The option whose value orders the tracks.                                                                                      |
| `direction` | `TrackSortDirection`: `"ascending"` or `"descending"` | `"descending"` reverses the order of the tracks that have a value, including the order of types; tracks without one stay last. |

## Behavior

With five or fewer options, each option appears as a chip. Clicking an included chip leaves that option out of the sort; clicking it again adds it back at the bottom of the priority list as the lowest tiebreaker.

With more than five options, chips would wrap onto several lines, so an "Add sort option" search field replaces them. It lists only the excluded options, and picking one adds it at the bottom of the priority list. Each priority row then has a remove button that excludes its option.

The priority list shows only included options, labeling the top one "Primary sort" and the rest "Tiebreaker". Dragging a row stays within the list. When no options are included, Apply keeps the current track order.

**Apply order** sorts with [`applyTrackSort`](#applytracksort), every included option ascending, and calls `onClose`. Sorting runs once per Apply; tracks added later are not sorted until the next Apply.

The dialog remembers the last applied priority while it stays mounted, and each opening starts from it. **Cancel**, the close button, Escape, and clicking outside the dialog call `onClose` and discard unapplied changes. Until the first Apply, every option currently in `options` is included, so options can change with the loaded tracks. An option added after a sort is applied starts excluded. Escape during a move cancels the move and leaves the dialog open.

## Accessibility

The dialog uses MUI's modal focus and keyboard behavior, and the close button is named "Close track sorting". Option chips are buttons whose `aria-pressed` state reports whether the option is included; excluded chips also use an outlined, struck-through style so state does not depend on color alone. With more than five options, the "Add sort option" field is a labeled combobox, and each row's remove button is named "Remove" followed by the option label. Rows in the "Sort priority" list are focusable. Press Space or Enter to pick up a row, the arrow keys to move it, Space or Enter to drop it, and Escape to cancel the move.

## Related reference

[Back to track sorting](README.md) · [ControlToolbar](../01-browserControls/ControlToolbar.md) · [UI API reference](../README.md)
