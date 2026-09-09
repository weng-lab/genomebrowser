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

The region field accepts the formats supported by `parseRegion`, including `chr12:53,372,922-53,423,700` and `chr12 53372922 53423700`. Coordinates are zero-based and half-open, so the start is included and the end is excluded. The region must fit within the browser store's assembly. Highlight IDs must be unique in that store.

New highlights have a Type selector (Filled or Outlined), a color, and an opacity percentage from 0–100. Filled is the default and shades the region. Outlined draws a 2-pixel border with no fill. Choosing a type sets opacity to 20% for Filled or 100% for Outlined; you can then adjust it. Each highlight in the list shows its type. An opacity of 0 is fully transparent; 100 is fully opaque.

Select a highlight's pencil action to edit its ID, region, type, color, and opacity inside the dialog. The form starts with the existing values. **Save changes** updates that highlight in place. The back arrow, **Cancel**, or closing the dialog discard unsaved edits. IDs must remain unique, but keeping the highlight's current ID is allowed. Invalid input stays in the form for correction.

Selecting a highlight's arrow action sets the browser viewport to that highlight's exact region.

## API

| Prop           | Type                   | Default  | Description                                                                     |
| -------------- | ---------------------- | -------- | ------------------------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Browser store whose current region and highlights the dialog reads and updates. |
| `open`         | `boolean`              | Required | Whether the dialog is open.                                                     |
| `onClose`      | `() => void`           | Required | Called when the user requests that the dialog close.                            |

## Accessibility

The dialog uses MUI's modal focus and keyboard behavior. The close, edit, navigate, and remove icon buttons have accessible names, and every form field has a visible label. Validation messages remain attached to their fields.
