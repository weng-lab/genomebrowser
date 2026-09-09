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

| Base option | Default     | Behavior                                                                                          |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `display`   | `"full"`    | The only display.                                                                                 |
| `height`    | `64`        | Track content height in SVG pixels; use at least 45 for the sequence and status row.              |
| `color`     | `"#475569"` | Coordinate ticks, axis and status text. Bases use conventional A/C/G/T colors plus their letters. |

| Config                     | Type     | Default | Behavior                                                                            |
| -------------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `sequenceUrl`              | `string` | Unset   | HTTP(S) UCSC version-0 2bit file. Must use the assembly's exact chromosome names.   |
| `sequenceMinPixelsPerBase` | `number` | `12`    | Minimum SVG pixels per base for fetching and drawing sequence; allowed range 6–100. |

Ticks adapt to region span and width. Tick labels use zero-based genomic coordinates; each letter is centered in its half-open base interval. Bases appear only when sufficiently separated. The sequence fetch threshold includes the browser's overscan, so panning preserves alignment without triggering chromosome-sized DNA reads. Metadata is reused for the lifetime of the mounted track. Changing either config option invalidates the track's fetch.

Unknown bases appear as `N`; masked bases remain lowercase. Sequence errors leave coordinates visible and show an unavailable message. Missing sequence shows a separate empty message. Changing the source or navigating requests again. No sequence request occurs when the URL is absent or the view is too broad.

The settings panel provides the 2bit URL and minimum pixels per base. A host-owned track disables URL editing. Shared base settings control title, height and coordinate color. There are no per-base callbacks or tooltips.

## Selecting regions

Selection belongs to the browser and works with any tracks, even after removing the ruler. Set `useBrowserStore.getState().setSelectionMode("zoom")` or `"highlight"` and drag across the data area. Use `"pan"` for normal panning. The UI package offers `BrowserSelectionControls` for these modes. Focus the browser and press P, Z or H; Escape cancels and returns to pan. Shift-drag temporarily selects zoom; Alt-Shift-drag temporarily creates a highlight.

See [Data source troubleshooting](../dataSources.md) for range and CORS requirements. Ordinary BigWig signal values cannot provide reference bases without a separate encoding contract.

## Exports

The `@weng-lab/genomebrowser-tracks/ruler` subpath exports `rulerModule`, `RulerCreateInput`, `RulerConfig`, and `RulerData`. `RulerData` contains reference `records` and an optional sequence-fetch `error` string.
