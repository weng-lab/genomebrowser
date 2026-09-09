# Ruler and reference sequence

Use `rulerModule` for genomic coordinates and optional reference DNA. It is an ordinary track: add, reorder, resize, configure, and remove it through the track store. The browser does not insert a ruler automatically.

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

const useTrackStore = createTrackStore({
  modules: [rulerModule],
  tracks: [
    rulerModule.create({
      id: "reference",
      title: "Reference",
      config: { sequenceUrl: "YOUR_URL_HERE" },
    }),
  ],
});
```

Replace the placeholder with a valid HTTP(S) 2bit URL for your assembly. For coordinates alone, use `config: {}`. `firstPartyTrackModules` includes the ruler module, but registering a module does not create a track.

| Base option | Default     | Behavior                                                                                                                    |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `display`   | `"full"`    | The only display.                                                                                                           |
| `height`    | `22`        | Automatically sized: 22 SVG pixels for coordinates, 48 when reference bases render.                                         |
| `color`     | `"#475569"` | Coordinate ticks and axis. Bases use A: `#228b22`, C: blue, G: orange, T: red, and N: `#64748b`, regardless of letter case. |

| Config                     | Type      | Default     | Behavior                                                                                                                                     |
| -------------------------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `sequenceUrl`              | `string`  | Unset       | HTTP(S) UCSC version-0 2bit file. Must use the assembly's exact chromosome names.                                                            |
| `sequenceMinPixelsPerBase` | `number`  | `15`        | Minimum SVG pixels per base for fetching and drawing sequence; allowed range 1–100.                                                          |
| `sequenceHighlightColor`   | `string`  | `"#64748b"` | Six-digit hex color for the browser-wide hover highlight on any reference base. Rendering only; changing it does not refetch sequence.       |
| `distinguishMaskedBases`   | `boolean` | `false`     | Show soft-masked bases in lowercase when enabled; otherwise display all bases uppercase. Rendering only; toggling does not refetch sequence. |

Ticks adapt to region span and width. Tick labels use zero-based genomic coordinates; each letter is centered in its half-open base interval. Bases appear when each base has at least 15 horizontal SVG pixels by default. For example, a 1,000-pixel track can show 66 bp and a 2,000-pixel track can show 133 bp. Letter size adapts to the available space. Fetching and rendering use the same pixels-per-base threshold; overscan preserves this ratio so panning stays aligned. Metadata is reused for the lifetime of the mounted track. Changing the sequence URL or resolution threshold invalidates the track's fetch.

Unknown bases appear as `N`; masked bases are displayed uppercase by default. Enable `distinguishMaskedBases` to display them lowercase while keeping unmasked bases uppercase. The 2bit reader preserves lowercase masking information in the returned records. Coordinates stay compact when sequence is missing or unavailable; errors are included in the SVG title. Changing the source or navigating requests again. No sequence request occurs when the URL is absent or the view is too broad.

The “Sequence highlight color” field sets one hover color for all reference bases.

The settings panel separates the 2bit URL under “Reference source” from “Sequence display” controls. A “Show DNA letters below” slider runs from “Farther out” (5 pixels per base) to “Closer in” (25), defaulting to 15. Display options are stacked: the live bp threshold above a full-width slider, highlight color, the masking checkbox, and current zoom status beside “Zoom in to sequence”. The threshold previews while dragging; the configuration commits on release. The programmatic config still accepts 1–100 pixels per base. The panel shows the largest sequence-visible span, rounded down from track width divided by minimum pixels per base, and updates when either changes. “Zoom in to sequence” centers that span on the current view, clamped to chromosome bounds. The button is disabled without a sequence URL, when the track is too narrow for one base, or when already at or below that span. Lower thresholds show sequence sooner; higher thresholds require more zoom. A host-owned track disables URL editing. Shared base settings control title and coordinate color. Content height is automatic. There is no zoom hint or status row below the coordinates. Hovering a reference base automatically adds a one-base, browser-wide highlight through the core highlight API. Moving between bases replaces it; leaving, dragging, navigating, losing window focus, or removing the ruler clears it. User-created highlights remain unchanged. The hover highlight temporarily appears in the shared highlights list, including any UI or persistence using that list. No app callback wiring is required. There are no per-base tooltips.

## Selecting regions

Selection belongs to the browser and works with any tracks, even after removing the ruler. Set `useBrowserStore.getState().setSelectionMode("zoom")` or `"highlight"` and drag across the data area. Use `"pan"` for normal panning. The UI package offers `BrowserSelectionControls` for these modes. Focus the browser and press P, Z or H; Escape cancels and returns to pan. Shift-drag temporarily selects zoom; Alt-Shift-drag temporarily creates a highlight.

See [Data source troubleshooting](../dataSources.md) for range and CORS requirements. Ordinary BigWig signal values cannot provide reference bases without a separate encoding contract.

## Exports

The `@weng-lab/genomebrowser-tracks/ruler` subpath exports `rulerModule`, `RulerCreateInput`, `RulerConfig`, and `RulerData`. `RulerData` contains reference `records` and an optional sequence-fetch `error` string.

During zoom transitions, ruler ticks cover the current viewport and up to one viewport on each side, clipped to the retained render region. Tick generation stays bounded while reference sequence loads, even after a chromosome-wide view.
