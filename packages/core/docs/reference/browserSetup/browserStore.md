# Browser store

`createBrowserStore` creates state for a browser's assembly, visible region, sizing configuration, selection mode, and highlights. Pass the resulting stable hook to [GenomeBrowser](GenomeBrowser.md).

## Usage

```tsx
import { createBrowserStore, hg38 } from "@weng-lab/genomebrowser";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
});

export function RegionReadout() {
  const region = useBrowserStore((state) => state.region);
  return (
    <output>
      {region.chromosome}:{region.start}-{region.end}
    </output>
  );
}
```

The factory returns a Zustand hook. Name it with a `use` prefix. Create it at file scope to share it, as above, or once inside each component for independent browsers. Recreating a store during rendering resets that state.

In React components, select displayed values and actions through the hook. For example, `useBrowserStore((state) => state.setRegion)` supplies an action for event handlers without subscribing to region changes. Use `getState()` outside React or for a deliberate event-time snapshot; it does not subscribe and cannot keep rendered values updated. The [getting-started example](../../gettingStarted/firstBrowser.md#access-browser-state-and-actions) demonstrates both state and action selection. The imperative snippets below illustrate calls outside React.

Use `subscribe(listener)` for external subscriptions and unsubscribe when their owner is disposed. The application owns the store's lifetime; unmounting a browser does not discard it. Use the actions below to preserve validation rather than bypassing them with Zustand's `setState`.

## createBrowserStore and BrowserStoreInput

`createBrowserStore(input: BrowserStoreInput): BrowserStoreInstance` validates construction input and throws if it cannot create valid state. The initial region is normalized against a copied, frozen assembly; a partially overlapping region is clamped. See [assemblies and regions](../assembliesAndRegions/assemblies.md) for coordinate and validation rules.

| Option               | Type                      | Default                                               | Description                                                                            |
| -------------------- | ------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `assembly`           | `AssemblyDefinition`      | Required                                              | Sequence names and bounds, fixed for this store's lifetime.                            |
| `region`             | `GenomicRegion`           | Required                                              | Initial zero-based, half-open visible region. Supply an object; parse text explicitly. |
| `marginWidth`        | `number`                  | `50`                                                  | Positive finite left gutter width in logical SVG units.                                |
| `trackWidth`         | `number`                  | `1000`                                                | Positive finite track width for fixed sizing, excluding the margin.                    |
| `fontSize`           | `number`                  | `10`                                                  | Positive finite font size in logical SVG units.                                        |
| `titleSize`          | `number`                  | `12`                                                  | Positive finite track-title font size in logical SVG units.                            |
| `highlights`         | `Highlight[]`             | `[]`                                                  | Initial highlights, validated individually.                                            |
| `selectionMode`      | `BrowserSelectionMode`    | `"pan"`                                               | Initial drag behavior.                                                                 |
| `selectionHighlight` | `SelectionHighlightStyle` | `{ color: "#f59e0b", opacity: 0.25, type: "filled" }` | Style used for newly drawn highlights.                                                 |

Responsive views measure their own width and do not write that measurement into `trackWidth`. Two views sharing a store can have different sizes and scales. See [sizing examples](GenomeBrowser.md#examples).

## BrowserStore and BrowserStoreInstance

`BrowserStore` contains all fields in the input table as initialized state: `assembly`, normalized `region`, `marginWidth`, `trackWidth`, `fontSize`, `titleSize`, `highlights`, `selectionMode`, and `selectionHighlight`. Input defaults are resolved, so these state fields are present. It also contains the actions below.

`assembly` is readonly; the public action API has no assembly, margin, or typography setter.

`BrowserStoreInstance` is `UseBoundStore<StoreApi<BrowserStore>>`, the Zustand hook plus its imperative store API.

## Navigation

### setRegion

`setRegion(region: GenomicRegion): BrowserRegionMutationResult` validates and commits a region using the store's assembly. It intersects partial overlaps with chromosome bounds, rejects non-overlapping regions, and leaves state unchanged on failure.

For text input, handle parsing errors separately from mutation results. Using the store from Usage:

```ts
import { parseRegion, type GenomicRegion } from "@weng-lab/genomebrowser";

function goToRegion(input: string) {
  let region: GenomicRegion;
  try {
    region = parseRegion(input);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid region");
    return;
  }

  const result = useBrowserStore.getState().setRegion(region);
  if (!result.ok) {
    console.error(result.error);
  } else if (result.clamped) {
    console.info(`Showing ${result.region.chromosome}:${result.region.start}-${result.region.end}`);
  }
}

goToRegion("chr12:53,372,922-53,423,700");
```

### zoom

`zoom(factor: number, centerBase?: number): BrowserRegionMutationResult` multiplies the current region width by a positive finite factor. Values below one zoom in; values above one zoom out. The target width is rounded to the nearest integer with a minimum of one base, and its start is rounded around the chosen center before normalization.

The default center is the current region midpoint. An explicit center must be a safe integer within the current chromosome's `[0, length)` bounds; it need not lie inside the current visible region.

```ts
const zoomIn = useBrowserStore.getState().zoom(0.5);
if (!zoomIn.ok) console.error(zoomIn.error);

const zoomOut = useBrowserStore.getState().zoom(2, 2_050_000);
if (!zoomOut.ok) console.error(zoomOut.error);
```

Boundary clamping can shorten the requested region. A successful store mutation updates state synchronously; it does not wait for mounted tracks to finish fetching or rendering. See [request behavior](../trackDefinition/fetchingData.md#requests-and-result-lifetime).

### BrowserRegionMutationResult and BrowserRegionMutationErrorCode

Both navigation actions return:

```ts
import type { BrowserRegionMutationErrorCode, GenomicRegion } from "@weng-lab/genomebrowser";

type Result =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | { ok: false; code: BrowserRegionMutationErrorCode; error: string };
```

`BrowserRegionMutationErrorCode` includes every [RegionErrorCode](../assembliesAndRegions/regions.md#regionresult-and-regionerrorcode), plus `INVALID_ZOOM_FACTOR` and `INVALID_ZOOM_CENTER`. Even a finite zoom factor can produce an invalid coordinate if the calculated region overflows. Expected navigation failures return a result and leave state unchanged.

## Fixed width

`setTrackWidth(trackWidth: number): BrowserViewportMutationResult` commits a positive finite logical track width. It affects views using `sizing="fixed"`; it does not change responsive measurements or the genomic region.

`BrowserViewportMutationResult` is `{ ok: true; trackWidth: number }` or `{ ok: false; code: "INVALID_TRACK_WIDTH"; error: string }`. An invalid width leaves the previous value unchanged.

## Selection

`BrowserSelectionMode` is `"pan" | "zoom" | "highlight"`. `setSelectionMode(mode: BrowserSelectionMode): BrowserSelectionMutationResult` replaces the active mode. Zoom and highlight modes remain active after a drag.

`SelectionHighlightStyle` is `Pick<Highlight, "color" | "opacity" | "type">`. It requires `color`; omitted `opacity` and `type` use the highlight rendering defaults.

`setSelectionHighlight(style: SelectionHighlightStyle): BrowserSelectionMutationResult` replaces the complete style. It does not merge omitted fields or restyle existing highlights.

Both setters return `{ ok: true }` on success. On failure, `BrowserSelectionMutationResult` uses the shared [mutation failure shape](trackStore.md#mutation-results) with code `INVALID_SELECTION_MODE` or `INVALID_SELECTION_HIGHLIGHT`. A failure leaves the entire store unchanged.

```ts
useBrowserStore.getState().setSelectionHighlight({
  color: "#2563eb",
  opacity: 0.8,
  type: "outlined",
});
useBrowserStore.getState().setSelectionMode("highlight");
// Drag the data area to add highlights; use "zoom" to navigate or "pan" to restore panning.
```

An unfinished selection is discarded on pointer cancellation, window blur, or changes to the region, drawing geometry, mode, highlight style, or interaction availability. Escape cancels an active drag; releasing the pointer afterward does not commit it. The browser SVG supplies no keyboard navigation or modifier-drag shortcuts; applications own those controls.

Drawn highlights receive a region-based ID such as `chr1:1,000-2,000`. If it is already in use, core appends the first available suffix starting with ` (2)`.

See [selection interactions](../../gettingStarted/navigationAndSelection.md#select-a-region-by-dragging) for pointer behavior, cancellation, and keyboard responsibilities.

## Highlights

Highlights mark genomic regions across the track area. Add them programmatically with `addHighlight`, or let users draw them in highlight selection mode. The `Highlight` type describes each stored entry.

### Highlight

| Field     | Type                                                  | Default                            | Description                                                                                                                            |
| --------- | ----------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | `string`                                              | Required                           | Non-empty identifier used for addition and removal.                                                                                    |
| `region`  | `{ chromosome?: string; start: number; end: number }` | Required                           | Integer bounds with `start < end`. Omit chromosome to show this coordinate range on any chromosome; a supplied name must be non-empty. |
| `color`   | `string`                                              | Required                           | Non-empty color string. Validation does not check CSS color syntax.                                                                    |
| `opacity` | `number`                                              | `0.2` for filled; `1` for outlined | Value from zero to one, applied to fill or border at rendering time.                                                                   |
| `type`    | `"filled"` or `"outlined"`                            | `"filled"`                         | Fill behind track data or transparent interior with a two-unit SVG border above track data.                                            |

Highlights are validated independently of the assembly: their chromosome membership and bounds are not normalized against it. Rendering clips them to the track area and shows chromosome-scoped entries only on the matching chromosome. Highlights follow the genomic coordinates during pan and zoom. Missing `type` and `opacity` stay optional in stored entries; rendering applies their defaults.

### addHighlight and removeHighlight

`addHighlight(highlight: Highlight): BrowserHighlightMutationResult` validates and appends an entry. `BrowserHighlightMutationResult` is `{ ok: true }` or the shared [mutation failure shape](trackStore.md#mutation-results) with code `INVALID_HIGHLIGHT`. An already-present ID is a successful no-op after validation; invalid input returns a failure without changing state. Initial `highlights` are individually validated, but construction does not deduplicate their IDs, so provide unique initial IDs.

`removeHighlight(id: string): void` removes all entries matching that ID; a missing ID is a no-op.

```ts
useBrowserStore.getState().addHighlight({
  id: "candidate",
  region: { chromosome: "chr2", start: 2_020_000, end: 2_030_000 },
  color: "#3366cc",
  type: "outlined",
});

useBrowserStore.getState().removeHighlight("candidate");
```

To add a filled highlight, omit `type` or use `"filled"`. Selection-created highlights use the active selection style, whose initial opacity is `0.25`, rather than the generic filled-highlight rendering default.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
