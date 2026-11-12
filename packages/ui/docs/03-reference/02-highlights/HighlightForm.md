# HighlightForm

`HighlightForm` is the form inside [`HighlightDialog`](HighlightDialog.md), for applications that place it in their own dialog or panel. It adds highlights to a browser store, or edits one highlight in place. Pass the same browser store instance used by `GenomeBrowser`.

## Usage

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { HighlightForm } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr12", start: 53_372_922, end: 53_423_700 },
});

export function AddHighlights() {
  return <HighlightForm browserStore={useBrowserStore} />;
}
```

## Examples

### Edit a highlight

Pass `initialHighlight` to edit that highlight. Here the form sits in an application's dialog, which closes when the edit is saved or canceled.

```tsx
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { BrowserStoreInstance, Highlight } from "@weng-lab/genomebrowser";
import { HighlightForm } from "@weng-lab/genomebrowser-ui";

type EditHighlightProps = {
  browserStore: BrowserStoreInstance;
  highlight: Highlight;
  open: boolean;
  onClose: () => void;
};

export function EditHighlight({ browserStore, highlight, open, onClose }: EditHighlightProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit highlight</DialogTitle>
      <DialogContent>
        <HighlightForm
          browserStore={browserStore}
          initialHighlight={highlight}
          onSaved={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
```

The form reads `initialHighlight` once, when it mounts. MUI's `Dialog` unmounts its content while closed, so each opening starts from the highlight's current values. To edit a different highlight in a form that stays mounted, give the form a `key` such as the highlight's ID.

## API

### HighlightFormProps

| Prop               | Type                   | Default  | Description                                                                                                                             |
| ------------------ | ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `browserStore`     | `BrowserStoreInstance` | Required | Browser store whose assembly, current region, and highlights the form reads, and whose highlights it updates.                           |
| `initialHighlight` | `Highlight`            | None     | The highlight to edit. The form starts with its values and **Save changes** replaces it in place. Without it, the form adds highlights. |
| `onSaved`          | `() => void`           | None     | Called after **Save changes** replaces the edited highlight. Not called when adding.                                                    |
| `onCancel`         | `() => void`           | None     | Shows a **Cancel** button that calls it. Without it, the form has no Cancel button.                                                     |

The fields are ID, Region, Type, Color, and Opacity (%). They follow the same rules as in [`HighlightDialog`](HighlightDialog.md): IDs must be unique in the store, though an edited highlight may keep its own, and a blank ID names the highlight by its coordinates with the core package's `createHighlightId`; the region must fit within the store's assembly; and opacity is a number from 0 to 100. Invalid input stays in the form with a message on its field. **Use Current Region** fills the region with the browser's current view.

When adding, the form starts with a blue Filled highlight at 20% opacity. **Add Highlight** adds it with the store's `addHighlight` and resets the form; **Clear** resets the form without adding. When editing, the Region field takes focus and **Save changes** replaces the highlight with the store's `updateHighlight`, keeping its position. A rejected add or edit stays in the form with the store's message above the fields.

## Accessibility

Every field has a visible label, and validation messages stay attached to their fields. The color field is named “Highlight color”.

## Related reference

[Back to highlights](README.md) · [UI API reference](../README.md)
