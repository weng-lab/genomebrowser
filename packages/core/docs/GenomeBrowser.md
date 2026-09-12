# GenomeBrowser

Render genomic tracks in a browser that follows its container automatically. Use fixed sizing when you need a specific drawing width, and `scale` to magnify or shrink the entire SVG without changing the visible genomic region.

## Usage

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

The host must provide a layout width. In flex or grid layouts, allow the containing item to shrink with `min-width: 0`. No application observer, ref, initial track width, or margin subtraction is needed.

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

`useFixedBrowserStore.getState().setTrackWidth(950)` changes the fixed track width. It excludes the margin and is expressed in logical SVG units before scale is applied.

## API

| Prop            | Type                      | Default                  | Description                                                                                                             |
| --------------- | ------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `browserStore`  | `BrowserStoreInstance`    | Required                 | Stable store for assembly, region, configured fixed track width, margin, typography, selection, and highlights.         |
| `trackStore`    | `TrackStoreInstance`      | Required                 | Stable store for registered modules, tracks, and ordering.                                                              |
| `settingsStore` | `SettingsStoreInstance`   | Internal store per mount | Optional application-owned settings store.                                                                              |
| `sizing`        | `"responsive" \| "fixed"` | `"responsive"`           | Follow the wrapper's content width, or use the browser store's configured track width. Can change while mounted.        |
| `scale`         | `number`                  | `1`                      | Finite positive magnification factor for the entire SVG. Invalid values throw a `RangeError`. Can change while mounted. |

`GenomeBrowserProps` is exported from `@weng-lab/genomebrowser`.

The browser store defaults to `marginWidth: 120` and `trackWidth: 1000`. The margin remains a logical gutter width in both sizing modes. The configured track width applies only to fixed sizing. Responsive measurements are local to each mounted browser and never update the store; two browsers sharing stores can have different sizes and scales.

## Accessibility

The SVG has `role="group"` and the accessible name `Genome browser`. Magnification enlarges the complete drawing, including its SVG controls and tooltips. It does not change HTML settings dialogs, context menus, or controls supplied by the host application, and does not replace browser zoom or keyboard accessibility.

## Notes

- This changes earlier implicit SVG scaling: responsive views now measure themselves; callers requiring store-controlled width must pass `sizing="fixed"`. Remove application observers that only synchronize `setTrackWidth` when adopting responsive sizing.
- The wrapper has a one-pixel border on each side. Responsive measurements exclude that border. Fixed drawing dimensions exclude it too; the complete unrestrained wrapper is two CSS pixels wider and taller than the SVG.
- Responsive views wait for the first positive measurement before rendering or requesting track data. Once measured, hidden containers preserve the last usable width until visible again. Responsive sizing requires `ResizeObserver`.
- Track width has a minimum of one logical unit. A container narrower than the scaled margin plus that minimum scrolls horizontally.
- Width-dependent data requests retain the runtime's brief debounce during continuous resizing or scale changes. Fixed scale changes leave logical track width unchanged and do not require a new width-dependent fetch.
- Each view owns its measurement and cleans up its observer on unmount or when switched to fixed sizing. Region and track stores survive unmounting when owned by the application.
