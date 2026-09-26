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

The module uses core's shared zoom selection and handles base hover highlights internally. It supplies no tooltip component. [firstPartyTrackModules](../02-collectionsAndSchemas/firstPartyTrackModules.md) includes the ruler.

## Displays and base defaults

| Base option | Default     | Behavior                                                                            |
| ----------- | ----------- | ----------------------------------------------------------------------------------- |
| `display`   | `"full"`    | The only display.                                                                   |
| `height`    | `22`        | The renderer uses 22 SVG pixels for coordinates and 48 when reference bases appear. |
| `color`     | `"#475569"` | Coordinate ticks and axis.                                                          |

Bases use fixed colors in either letter case: A uses `#228b22`, C blue, G orange, T red, and N `#64748b`.

## Config

| Option                   | Type      | Default     | Description                                                                               |
| ------------------------ | --------- | ----------- | ----------------------------------------------------------------------------------------- |
| `sequenceUrl`            | `string`  | Unset       | HTTP or HTTPS URL for a version-0 UCSC 2bit file.                                         |
| `sequenceHighlightColor` | `string`  | `"#64748b"` | Six-digit hex color for the highlight shown when hovering a base.                         |
| `distinguishMaskedBases` | `boolean` | `false`     | Shows soft-masked bases in lowercase when enabled. Otherwise, all bases appear uppercase. |

Changing the URL requests sequence again. Highlight color and masking changes update rendering from current data.

## Sequence display and fetching

Ticks adapt to region width and use zero-based coordinates. Each base letter is centered over its half-open genomic region. Letter size follows the available space.

The host sets `basePairDetail.maxVisibleBases` in `createBrowserStore`, or changes it with `setBasePairDetail`. The default is 100 visible bp, inclusive. Core's `useBasePairDetail()` enables letters at 8 logical SVG units per base and keeps them visible down to 6. Overscan does not affect the gate; resizing uses the actual plot width. Responsive UI scale changes logical width, while fixed sizing scale leaves the gate unchanged.

Fetching uses the bp cutoff, independent of the width guard. A configured ruler prepares sequence within that cutoff even if the plot is too narrow to display it. The reader reuses file metadata and the last successful sequence window for the mounted track. Width-only changes reuse that sequence. Without a URL, or outside the cutoff, the ruler makes no sequence request.

Unknown bases appear as `N`. The reader preserves lowercase masking information; `distinguishMaskedBases` controls whether the ruler displays it. A missing chromosome produces no sequence. Request failures keep the coordinate axis visible and put the error in its SVG title. Changing the source or navigating requests data again. See [Data source troubleshooting](../../04-troubleshooting.md) for range and CORS requirements.

During zoom transitions, ticks cover the viewport and up to one viewport on either side, clipped to the retained render region. The ruler limits tick generation while sequence loads, including after a chromosome-wide view.

## Settings

The form groups controls under "Reference source" and "Sequence appearance". Host-owned tracks disable URL editing. Shared base settings edit the title and coordinate color; content determines height.

Sequence visibility is configured once by the host browser. The ruler form has no independent threshold or width-derived zoom shortcut.

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

Outside React, call `useBrowserStore.getState().setSelectionMode("zoom")`, `"highlight"`, or `"pan"` on the application-owned store. React controls should select `setSelectionMode` through the store hook. The UI package provides `SelectionControls`. The host application owns keyboard shortcuts; the browser SVG does not take focus or register them.

## Exports

The `/ruler` entry exports `rulerModule`, `RulerCreateInput`, `RulerConfig`, and `RulerData`. `RulerData` is `{ records: TwoBitRecord[]; error?: string }`; `TwoBitRecord` comes from `@weng-lab/genomic-reader`.

Return to [Track modules](README.md) or [Tracks API reference](../README.md).
