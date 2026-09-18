# Ruler and reference sequence

Add `rulerModule` to draw genomic coordinates and optional reference DNA. The browser does not insert a ruler automatically. Ruler navigation and highlights use the hosting browser's stores.

## Usage

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";

const useTrackStore = createTrackStore({
  modules: [rulerModule],
  tracks: [
    rulerModule.create({
      base: { id: "reference", title: "Reference" },
      config: {},
    }),
  ],
});
```

This draws coordinates without fetching sequence. To add DNA bases, set `config.sequenceUrl` to a version-0 UCSC 2bit URL for your assembly. Its chromosome names must match the assembly exactly.

## rulerModule

`rulerModule.create(input, interaction?)` returns a track with `type: "ruler"`. Register `rulerModule` with the track store before adding its instances. See [Create and validate tracks](trackCreation.md) for required base fields, source ownership, schemas, and validation errors.

The module uses core's shared zoom selection and handles base hover highlights internally. It supplies no tooltip component. [firstPartyTrackModules](../collectionsAndSchemas/firstPartyTrackModules.md) includes the ruler.

## Displays and base defaults

| Base option | Default     | Behavior                                                                            |
| ----------- | ----------- | ----------------------------------------------------------------------------------- |
| `display`   | `"full"`    | The only display.                                                                   |
| `height`    | `22`        | The renderer uses 22 SVG pixels for coordinates and 48 when reference bases appear. |
| `color`     | `"#475569"` | Coordinate ticks and axis.                                                          |

Bases use fixed colors in either letter case: A uses `#228b22`, C blue, G orange, T red, and N `#64748b`.

## Config

| Option                     | Type      | Default     | Description                                                                               |
| -------------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------- |
| `sequenceUrl`              | `string`  | Unset       | HTTP or HTTPS URL for a version-0 UCSC 2bit file.                                         |
| `sequenceMinPixelsPerBase` | `number`  | `15`        | Minimum SVG pixels per base for fetching and drawing sequence. Accepts 1 through 100.     |
| `sequenceHighlightColor`   | `string`  | `"#64748b"` | Six-digit hex color for the highlight shown when hovering a base.                         |
| `distinguishMaskedBases`   | `boolean` | `false`     | Shows soft-masked bases in lowercase when enabled. Otherwise, all bases appear uppercase. |

Changing the URL or resolution threshold requests sequence again. Highlight color and masking changes update rendering from current data.

## Sequence display and fetching

Ticks adapt to region width and use zero-based coordinates. Each base letter is centered over its half-open genomic region. By default, letters appear at 15 SVG pixels per base or more. A 1,000-pixel drawing can therefore show 66 bases, and a 2,000-pixel drawing can show 133. Letter size follows the available space.

Fetching and drawing use the same resolution threshold, including data retained outside the viewport for panning. The reader reuses file metadata for the mounted track. Without a URL, or when zoomed too far out, the ruler makes no sequence request.

Unknown bases appear as `N`. The reader preserves lowercase masking information; `distinguishMaskedBases` controls whether the ruler displays it. A missing chromosome produces no sequence. Request failures keep the coordinate axis visible and put the error in its SVG title. Changing the source or navigating requests data again. See [Data source troubleshooting](../../legacy/dataSources.md) for range and CORS requirements.

During zoom transitions, ticks cover the viewport and up to one viewport on either side, clipped to the retained render region. The ruler limits tick generation while sequence loads, including after a chromosome-wide view.

## Settings

The form groups controls under "Reference source", "Sequence visibility", and "Sequence appearance". Host-owned tracks disable URL editing. Shared base settings edit the title and coordinate color; content determines height.

### Sequence resolution

The slider runs from 5 pixels per base at "Farther out" to 25 at "Closer in", with a default of 15. ACGTACGT letters preview the selected spacing with the ruler's glyphs and colors. Dragging updates the preview; releasing commits the threshold. Programmatic config accepts the wider range of 1 through 100. Lowering the threshold shows bases farther out; raising it requires closer zoom.

The form shows the largest sequence-visible span as `floor(trackWidth / sequenceMinPixelsPerBase)` and updates it as width or threshold changes. "Zoom in to sequence" centers that span on the current view, clamped to chromosome bounds. It is disabled without a source, when the track cannot fit one base, or when the current view is already at least that close.

### Sequence appearance

"Sequence highlight color" sets the hover color for every base. "Distinguish masked bases" controls lowercase display.

## Hover highlights

Hovering a base adds a one-base highlight across the browser. Moving to another base replaces it. Leaving, dragging, navigating, losing window focus, or removing the ruler clears it while preserving user-created highlights. No application callback is required.

The temporary highlight appears in the browser's shared highlights list. Application UI and persistence that read that list can observe it. Bases have no individual tooltips.

## Selecting regions

In Pan mode, pressing the coordinate axis or tick labels switches the browser and toolbar to Zoom and starts shared region selection. The preview spans the full browser height.

Releasing a drag zooms to the selected region. Escape, pointer cancellation, or losing window focus cancels the selection. Zoom stays active after either finishing or cancelling.

The hit area ends above the DNA letters, which retain their hover and panning behavior. Moving over a dialog does not activate ruler interactions.

The browser's Zoom and Highlight modes cover the data area with a crosshair and vertical cursor guide and block underlying track interactions. Return to Pan to restore the ruler's axis selection behavior. These browser modes also work without a ruler.

Outside React, call `useBrowserStore.getState().setSelectionMode("zoom")`, `"highlight"`, or `"pan"` on the application-owned store. React controls should select `setSelectionMode` through the store hook. The UI package provides `BrowserSelectionControls`. The host application owns keyboard shortcuts; the browser SVG does not take focus or register them.

## Exports

The `/ruler` entry exports `rulerModule`, `RulerCreateInput`, `RulerConfig`, and `RulerData`. `RulerData` is `{ records: TwoBitRecord[]; error?: string }`; `TwoBitRecord` comes from `@weng-lab/genomic-reader`.

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
