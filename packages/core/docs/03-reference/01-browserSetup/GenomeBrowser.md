# GenomeBrowser

Render genomic tracks in a browser that follows its container automatically. Use fixed sizing when you need a specific drawing width, and `scale` to magnify or shrink the entire SVG without changing the visible genomic region.

## Usage

Install the runtime and track dependencies as shown in [Getting started](../../01-gettingStarted/01-firstBrowser.md).

```tsx
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

const useBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_010_000 },
});
const useTrackStore = createTrackStore({
  modules: [rulerModule],
  tracks: [rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} })],
});

export function Browser() {
  return <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />;
}
```

The host must provide a layout width. In flex or grid layouts, allow the containing item to shrink with `min-width: 0`. `GenomeBrowser` measures the container itself.

## Examples

### Responsive magnification

Using the stores above:

```tsx
<div style={{ width: "100%", maxWidth: 1000, minWidth: 0 }}>
  <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} scale={1.25} />
</div>
```

The browser stays within the available width. Its logical SVG width is the wrapper's content width divided by `scale`. For 1000 CSS pixels of content at `scale={1.25}`, the viewBox is 800 units wide. The margin is subtracted from those 800 units to determine track width.

Text, controls, strokes, SVG tooltips, and track heights grow together. `scale={0.75}` makes them smaller. The genomic region stays unchanged; tracks receive the resulting logical width for rendering and data requests. Larger scales can therefore produce fewer labels or more aggregated data, depending on the track module.

Applications can keep `scale` in React state and update it from a slider or saved preference. The browser does not persist the preference.

### Fixed sizing

```tsx
const useFixedBrowserStore = createBrowserStore({
  assembly: hg38,
  region: { chromosome: "chr1", start: 1_000_000, end: 1_010_000 },
  marginWidth: 50,
  trackWidth: 750,
});

<GenomeBrowser
  browserStore={useFixedBrowserStore}
  trackStore={useTrackStore}
  sizing="fixed"
  scale={1.25}
/>;
```

The drawing is 800 logical units wide and displays at 1000 CSS pixels. At `scale={1}`, it displays at 800 pixels; at `scale={0.75}`, it displays at 600 pixels. Fixed sizing does not observe the container. The wrapper scrolls horizontally when the drawing is wider than the available space.

Outside React, `useFixedBrowserStore.getState().setTrackWidth(950)` changes the fixed track width. Inside a component, select `state.setTrackWidth` from `useFixedBrowserStore` and call that action from the control's event handler. The width excludes the margin and is expressed in logical SVG units before scale is applied.

### Hosted application dialogs

Pass application controls or dialogs as children when they need [browser context](useGenomeBrowser.md). Children render after the browser view, outside the SVG, and can use `useGenomeBrowser()` to access the supplied stores. A portal-based dialog keeps that context when it opens elsewhere in the document. The application controls its visibility and mutations.

```tsx
<GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore}>
  <YourTrackDialog />
</GenomeBrowser>
```

Like the browser runtime, children mount after the first positive container measurement in responsive mode. Use an HTML component or a portal here; SVG overlays belong in track renderers.

## API

| Prop           | Type                      | Default        | Description                                                                                                             |
| -------------- | ------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `browserStore` | `BrowserStoreInstance`    | Required       | Stable store for assembly, region, configured fixed track width, margin, typography, selection, and highlights.         |
| `trackStore`   | `TrackStoreInstance`      | Required       | Stable store for registered modules, tracks, and ordering.                                                              |
| `sizing`       | `"responsive" \| "fixed"` | `"responsive"` | Follow the wrapper's content width, or use the browser store's configured track width. Can change while mounted.        |
| `children`     | `ReactNode`               | None           | Application content rendered outside the SVG with browser context.                                                      |
| `scale`        | `number`                  | `1`            | Finite positive magnification factor for the entire SVG. Invalid values throw a `RangeError`. Can change while mounted. |

`GenomeBrowserProps` is exported from `@weng-lab/genomebrowser`.

The [browser store](browserStore.md) configures the logical gutter and fixed track width. The gutter applies in both sizing modes; the configured track width applies only to fixed sizing. Responsive measurements are local to each mounted browser and never update the store; two browsers sharing stores can have different sizes and scales.

## Accessibility

The SVG has `role="group"` and the accessible name `Genome browser`. The `scale` prop affects SVG content only. HTML settings dialogs, context menus, and application controls retain their size. Scaling the drawing does not replace browser zoom or keyboard support.

## Track row hover

Hovering the left track margin, including the color strip and track controls, highlights the row while interactions are enabled. Leaving the margin clears the highlight. The centered title and genomic data area do not activate it.

## Track context menu

Right-click a track's data area to open its context menu. `GenomeBrowser` owns the menu state internally.

The menu shows registered display names and a remove button. Actions are disabled while browser interactions are blocked, and a successful action closes it. Clicking outside, pressing Escape, or scrolling outside the menu dismisses it. Scrolling within a tall menu keeps it open. Resizing the viewport recalculates its placement.

The choices are native buttons. The component does not implement ARIA menu roles, arrow-key menu navigation, or automatic focus placement/restoration. An application that supplies its own menu must implement its keyboard and focus behavior.

## Notes

- The wrapper has a one-pixel border on each side. Responsive measurements exclude that border. Fixed drawing dimensions exclude it too; the wrapper is two CSS pixels wider and taller than the SVG when the layout does not constrain it.
- Responsive views wait for the first positive measurement before rendering or requesting track data. Once measured, hidden containers preserve the last usable width until visible again. Responsive sizing requires `ResizeObserver`.
- Track width has a minimum of one logical unit. A container narrower than the scaled margin plus that minimum scrolls horizontally.
- Width-dependent data requests retain the runtime's brief debounce during continuous resizing or scale changes. Fixed scale changes leave logical track width unchanged and do not require a new width-dependent fetch.
- Each view owns its measurement and cleans up its observer on unmount or when switched to fixed sizing. Region and track stores survive unmounting when owned by the application.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
