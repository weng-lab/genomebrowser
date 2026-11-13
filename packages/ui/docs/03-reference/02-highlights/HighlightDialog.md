# HighlightDialog

`HighlightDialog` lets people add, edit, remove, and navigate to browser highlights. Pass the same browser store instance used by `GenomeBrowser` so both components read and update the same regions.

## Usage

```tsx
import { useState } from "react";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { HighlightDialog } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
});

const useTrackStore = createTrackStore({ modules: [] });

export function BrowserWithHighlights() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Highlights
      </button>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <HighlightDialog browserStore={useBrowserStore} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

`ControlToolbar` and `ManagementControls` provide a **Manage highlights** icon button through `onManageHighlights`, so `onManageHighlights={() => setOpen(true)}` can replace the button above.

The region field accepts the formats supported by `parseDisplayRegion`. Positions such as `chr12:53,372,922-53,423,700` or `chr12:53,372,922` are one-based and inclusive, as in the UCSC Genome Browser. Three whitespace-delimited fields such as `chr12 53372921 53423700` are zero-based BED coordinates. Both examples select the same bases. The dialog shows existing highlights in the one-based form, while the browser store keeps zero-based, half-open regions. The region must fit within the browser store's assembly. A new highlight's ID is its coordinates, as drawn highlights are named, with a numeric suffix when needed to keep IDs unique. The Name field sets the name the list shows, which need not be unique; a blank name is the coordinates. A highlight without a name shows its ID.

**Clear** resets the add form and its validation messages to the default values without changing existing highlights.

Choose Filled or Outlined in the Type selector. New highlights also have a color and an opacity percentage from 0 to 100. Filled is the default and shades the region. Outlined draws a 2-pixel border with no fill.

Choosing a type sets opacity to 20% for Filled or 100% for Outlined. Adjust the opacity afterward if needed. An opacity of 0 is fully transparent, and 100 is fully opaque. **Hidden** keeps a highlight in the list without drawing it. Each highlight in the list shows its type, and “Hidden” while it is hidden, such as “Filled · Hidden”.

Select a highlight's pencil action to edit its name, region, type, color, opacity, and whether it is hidden inside the dialog. The form starts with the existing values. **Save changes** updates that highlight in place and keeps its ID. Uncheck **Hidden** to draw a hidden highlight again. The back arrow, **Cancel**, or closing the dialog discard unsaved edits. Invalid input stays in the form for correction.

Highlights appear newest first, using the reverse of their order in the browser store. Editing a highlight keeps its position; initial highlights follow the order supplied by the application. Drag-created highlights have region-based IDs, with numeric suffixes when needed to keep IDs unique.

Selecting a highlight's arrow action sets the browser viewport to that highlight's exact region.

**Remove all** appears above the list while any highlights exist. It asks for confirmation, then removes every highlight in the browser store.

## API

### HighlightDialogProps

| Prop           | Type                   | Default  | Description                                                                     |
| -------------- | ---------------------- | -------- | ------------------------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Browser store whose current region and highlights the dialog reads and updates. |
| `open`         | `boolean`              | Required | Whether the dialog is open.                                                     |
| `onClose`      | `() => void`           | Required | Called when the user requests that the dialog close.                            |

## Accessibility

The dialog uses MUI's modal focus and keyboard behavior. The close, edit, navigate, and remove icon buttons have accessible names, and every form field has a visible label. Validation messages remain attached to their fields.

## Related reference

[Back to highlights](README.md) · [UI API reference](../README.md)
