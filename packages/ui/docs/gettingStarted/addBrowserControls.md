# Add browser controls

Connect navigation buttons, region selection controls, and a highlight dialog to the same browser store as `GenomeBrowser`. This example renders a coordinate ruler and a BigWig signal track, with controls above them.

Complete the [package installation](../../README.md#install) in an existing React application, then add the first-party tracks:

```sh
pnpm add @weng-lab/genomebrowser-tracks@2.0.0
```

Use a browser-accessible BigWig file aligned to hg38. Replace `YOUR_URL_HERE` below and choose a region containing data. The example runs in a client-rendered React component.

## Create stores for the browser

The browser store holds the assembly, visible region, and highlights. The track store holds the rows to render and the modules that implement them. Create both once per mounted browser with lazy state initializers. Each mounted copy then has its own region and tracks.

Create `Browser.tsx` with the following component. The region spans 100,000 bases on `chr1`; its zero-based coordinates include the start and exclude the end. The wrapper lets the browser shrink inside flex and grid layouts, and `GenomeBrowser` measures its width automatically.

```tsx
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { GenomeBrowser, createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
import { rulerModule } from "@weng-lab/genomebrowser-tracks/ruler";
import {
  BrowserNavigationButton,
  BrowserSelectionControls,
  HighlightDialog,
} from "@weng-lab/genomebrowser-ui";

export function Browser() {
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
      region: { chromosome: "chr1", start: 1_000_000, end: 1_100_000 },
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [rulerModule, bigWigModule],
      tracks: [
        rulerModule.create({ base: { id: "ruler", title: "Coordinates" }, config: {} }),
        bigWigModule.create({
          base: { id: "signal", title: "Signal" },
          config: { url: "YOUR_URL_HERE" },
        }),
      ],
    }),
  );
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
        <BrowserNavigationButton
          browserStore={useBrowserStore}
          action={{ type: "pan", fraction: -0.5 }}
        >
          Pan left
        </BrowserNavigationButton>
        <BrowserNavigationButton
          browserStore={useBrowserStore}
          action={{ type: "pan", fraction: 0.5 }}
        >
          Pan right
        </BrowserNavigationButton>
        <BrowserNavigationButton
          browserStore={useBrowserStore}
          action={{ type: "zoom", factor: 0.5 }}
        >
          Zoom in
        </BrowserNavigationButton>
        <BrowserNavigationButton
          browserStore={useBrowserStore}
          action={{ type: "zoom", factor: 2 }}
        >
          Zoom out
        </BrowserNavigationButton>
        <BrowserSelectionControls browserStore={useBrowserStore} />
        <Button onClick={() => setHighlightsOpen(true)}>Highlights</Button>
      </Box>
      <GenomeBrowser browserStore={useBrowserStore} trackStore={useTrackStore} />
      <HighlightDialog
        browserStore={useBrowserStore}
        open={highlightsOpen}
        onClose={() => setHighlightsOpen(false)}
      />
    </Box>
  );
}
```

Keep stores at file scope instead when multiple component instances should deliberately share them. Calling a store factory on every render loses the state used by the browser and its controls.

## Use the controls

Render `<Browser />` in the application. Pan moves by the chosen fraction of the current region. Zoom multiplies the region span by its factor; `0.5` shows half as many bases and `2` shows twice as many. Navigation buttons disable actions that cannot move further at the chromosome or zoom boundary.

## Select and manage regions

Choose Pan, Select zoom, or Highlight to set the browser's drag mode. Select zoom navigates to the dragged region. Highlight adds a marked region to the browser store.

Open Highlights to inspect those regions or add one by coordinates. The dialog can edit, remove, or navigate to a highlight. Adding a highlight, saving an edit, and removing a highlight update the store. Closing the dialog discards unsaved form edits; it does not undo changes already accepted by the store.

The application controls dialog visibility through `open` and `onClose`. The highlight list itself comes from the browser store, so it also includes highlights created by dragging or by application code.

## Continue

[Choose tracks from collections](../guides/trackSelection.md) replaces a fixed signal list with a track picker. [Connect a chromosome overview](../guides/chromosomeOverview.md) adds a full-chromosome view above the browser.

See the [browser controls reference](../reference/browserControls/README.md) and [HighlightDialog reference](../reference/highlights/HighlightDialog.md) for exact props and behavior. If the browser or controls do not respond, start with [troubleshooting](../troubleshooting.md).
