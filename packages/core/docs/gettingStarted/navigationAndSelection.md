# Navigate and select regions

This chapter uses the browser from [Add and configure tracks](configureTracks.md). The examples assume its shared stores in `browserState.ts`; [state and action access](firstBrowser.md#access-browser-state-and-actions) covers how to use those stores from React.

## Pan through the genome

The browser starts in pan mode. Drag horizontally from a track's title or data area to move the view along the current chromosome while keeping the genomic span unchanged. The full title row supports panning, including on short tracks. Drag left toward higher coordinates or right toward lower coordinates. Horizontal trackpad scrolling also pans. Scrolling right moves toward higher coordinates, and scrolling left moves toward lower coordinates. A side-scrolling mouse can also pan left and right. Gestures that move more vertically than horizontally scroll the page.

On touchscreens in pan mode, swipe horizontally over track content to pan and vertically to scroll the page. Drag the left margin to lift and reorder an unpinned track, then release to drop it. No long press is needed. The margin reserves touch gestures for reordering, and the desktop cursor stays in the grabbing state until the reorder ends.

During a pan, existing track content moves immediately while the browser requests data for the new region. Core temporarily blocks track interactions until the data has loaded and matches its position on screen. Hovering and clicking then resume.

## Navigate to a region

Use `setRegion` to jump to a known genomic region, such as a search result or a selected feature. The region must use the browser's assembly and zero-based, half-open coordinates.

Within an existing React component, select `setRegion` and call it from the handler that initiates navigation. This example opens a region on `chr1`:

```tsx
const setRegion = useBrowserStore((state) => state.setRegion);

function showRegion() {
  const result = setRegion({
    chromosome: "chr1",
    start: 1_010_000,
    end: 1_025_000,
  });
  if (!result.ok) console.error(result.error);
}
```

A region partly outside the chromosome is clipped to its bounds and returns `clamped: true`. An unknown chromosome or an invalid region is rejected, leaving the view unchanged. A successful result means the region was committed; the resulting track requests may still be loading.

For coordinates supplied as text, `parseRegion` converts a string such as `"chr1:1,010,000-1,025,000"` into the object accepted by `setRegion`. Parsing checks the text format and can throw; `setRegion` performs the assembly validation. The [region reference](../reference/assembliesAndRegions/regions.md) covers parsing and coordinate rules.

## Zoom in or out

Zooming changes the number of bases visible in the viewport. The store's `zoom` action multiplies the current span by a factor: `zoom(0.5)` halves the span, and `zoom(2)` doubles it. By default, the region stays centered on its midpoint. An optional second argument selects a different center base on the current chromosome.

This differs from the `scale` prop on `GenomeBrowser`. Scale changes the size of text, controls, and the drawing as a whole while preserving the genomic region. Use zoom to inspect a smaller region, and scale to change the visualization's physical size.

## Select a region by dragging

The active selection mode determines what a drag across the data area does:

| Mode        | Drag behavior                                     |
| ----------- | ------------------------------------------------- |
| `pan`       | Move the current view along the chromosome.       |
| `zoom`      | Navigate to the selected region.                  |
| `highlight` | Mark the selected region without moving the view. |

Set the initial mode with `selectionMode` in the browser-store input, or change it later with `setSelectionMode`. Zoom and highlight modes display a crosshair and a vertical guide across the data area. Their selection overlay handles the gesture instead of track hover, clicks, context menus, or panning. Returning to pan mode restores those interactions.

In Pan mode, drag the ruler's coordinate axis to zoom into a region. This switches the toolbar to Zoom mode, which stays selected after you finish or cancel the drag. Select Pan to resume panning.

A completed selection leaves the chosen mode active, allowing repeated zooms or highlights. Escape cancels an unfinished selection without changing the mode, viewport, or existing highlights. The drag must span at least four SVG pixels, and its bounds round outward to whole bases. Selection works across the browser independently of the ruler track.

## Keep regions marked with highlights

Highlights mark genomic regions across the track area and follow their coordinates during navigation. A highlight created by dragging retains its chromosome and remains in the store when the view moves elsewhere. Returning to that region makes it visible again.

The initial selection style is filled amber at opacity `0.25`. Configure `selectionHighlight` in the browser-store input, or use `setSelectionHighlight` to change the style for subsequent selections. The style accepts a color, opacity, and either `filled` or `outlined` type. Changing it does not restyle highlights already created.

For known regions, `addHighlight` adds a highlight with an application-chosen ID, region, and style. `removeHighlight` removes it by ID. Include the chromosome in the region to keep the highlight specific to that chromosome. An existing ID makes `addHighlight` a no-op rather than replacing that entry. The [highlight reference](../reference/browserSetup/browserStore.md#highlights) describes the stored shape and validation behavior.

## Use the provided controls

The optional UI package provides `BrowserNavigationButton` for pan and zoom actions and `BrowserSelectionControls` for choosing the drag mode. Bind them to the same browser store as the visualization so their actions operate on its current region and selection state.

In addition to the dependencies from the first chapter, install the UI package and its remaining peers:

```sh
pnpm add @weng-lab/genomebrowser-ui@latest @mui/icons-material@latest @mui/x-data-grid-premium@latest @mui/x-license@latest @mui/x-tree-view@latest
```

The following `App.tsx` uses the provided controls with the existing `Browser` component. Each navigation button declares its action, while the selection control supplies the Pan, Zoom, and Highlight choices:

```tsx
import { BrowserNavigationButton, BrowserSelectionControls } from "@weng-lab/genomebrowser-ui";
import { Browser } from "./Browser";
import { useBrowserStore } from "./browserState";

export default function App() {
  return (
    <>
      <BrowserNavigationButton
        browserStore={useBrowserStore}
        action={{ type: "zoom", factor: 0.5 }}
      >
        Zoom in
      </BrowserNavigationButton>
      <BrowserNavigationButton browserStore={useBrowserStore} action={{ type: "zoom", factor: 2 }}>
        Zoom out
      </BrowserNavigationButton>
      <BrowserSelectionControls browserStore={useBrowserStore} />
      <Browser />
    </>
  );
}
```

The UI package also provides `HighlightDialog` to add, edit, remove, and navigate to stored highlights. It uses the same browser store, with `open` and `onClose` controlled by the application. These controls supplement the viewport's pointer interactions; the browser SVG itself does not register navigation keyboard shortcuts.

## Continue

[Use track collections](trackCollections.md) describes reusable track catalogs and how to load them directly or through TrackSelect. The [browser-store reference](../reference/browserSetup/browserStore.md) contains the complete navigation, selection, and highlight contracts.
