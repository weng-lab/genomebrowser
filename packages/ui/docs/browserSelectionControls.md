# BrowserSelectionControls

Choose how dragging across the genome browser behaves: pan, zoom to a selected region, or create a highlight.

## Usage

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";
import { BrowserSelectionControls } from "@weng-lab/genomebrowser-ui";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 100, end: 200 },
});

export function SelectionToolbar() {
  return <BrowserSelectionControls browserStore={useBrowserStore} />;
}
```

Pass the same browser store to `GenomeBrowser`. The control reflects store changes, including changes made by application controls. Clicking the selected button leaves that mode active. Selecting a region keeps the chosen mode active for repeated actions.

## API

| Prop           | Type                   | Default  | Description                                              |
| -------------- | ---------------------- | -------- | -------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance` | Required | Owns the selected mode and the displayed browser region. |
| `disabled`     | `boolean`              | `false`  | Disables all mode buttons.                               |

The package exports `BrowserSelectionControls` and `BrowserSelectionControlsProps` from its root.

## Accessibility

The MUI toggle group has the name **Region interaction**. Each button has a visible label and exposes its selected state. Buttons work with Tab, Enter and Space. The genome browser SVG does not take focus or register keyboard shortcuts; applications can implement bindings using the browser store.

## Notes

Drags use the data area, leaving track controls in the left margin accessible. A drag under four SVG pixels has no selection effect; selections round outward to whole bases. Pointer cancellation, window blur, geometry changes and mode changes discard unfinished selections.

New highlights use `selectionHighlight` from the browser store, defaulting to filled amber (`#f59e0b`) at opacity 0.25. Use `setSelectionHighlight({ color, opacity, type })` to configure subsequent selections, including `type: "outlined"`. They have unique IDs and retain their chromosome. Manage them using `HighlightDialog` or the store's highlight methods.
