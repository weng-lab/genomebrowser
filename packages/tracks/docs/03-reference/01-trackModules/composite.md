# Composite

`compositeModule` displays ordinary child tracks in one track row and supplies MUI settings for the container and its children. Core owns the store operations, data lifetime, and plot hosting. The composite module has no fetcher or ordinary renderer.

## Usage

```ts
import { createTrackStore } from "@weng-lab/genomebrowser";
import { compositeModule } from "@weng-lab/genomebrowser-tracks/composite";
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";

const signals = compositeModule.create({
  base: { id: "signals", title: "Signals", display: "overlay", height: 150 },
  config: { opacity: 0.6 },
  tracks: [
    bigWigModule.create({
      base: { id: "atac", title: "ATAC", color: "#527ac7" },
      config: { url: "YOUR_URL_HERE" },
    }),
    bigWigModule.create({
      base: { id: "histone", title: "Histone", color: "#d2693c" },
      config: { url: "YOUR_URL_HERE" },
    }),
  ],
});
const useTrackStore = createTrackStore({
  modules: [bigWigModule, compositeModule],
  tracks: [signals],
});
```

Replace each URL with a BigWig source. The module is also included in `firstPartyTrackModules`. Its `kind` is `"composite"` and `type` is `"composite"`.

## Creation and layout

`create` accepts `base`, optional `source` and `config`, and a nonempty `tracks` array of ordinary runtime instances. `base.id` and `base.title` are required. Defaults are display `"stack"`, configured overlay height `150`, color `"#000000"`, source `"user"`, gap `4`, and opacity `1`.

Stack height is the sum of child heights plus gaps. Overlay uses the configured composite height and applies opacity to each child. Gap must be nonnegative, opacity must be between 0 and 1, and height must be positive. Children retain their display modes and independent numerical scales. Nested composites are rejected, and the store checks global ID uniqueness and child module schemas.

Use core's `groupTracks`, `extractTracks`, `ungroupTrack`, and `reorderChildren` actions to change structure. Child IDs and data lifetimes survive grouping and extraction when fetch inputs stay unchanged. Removal deletes the addressed track and releases its resources; removing a composite deletes all its children.

Overlay tooltips show the child tracks' existing tooltip content in a vertical stack, with the topmost painted child first. Signal tracks resolve the value at the pointer; feature tracks contribute when a feature is under that same point. Click and hover callbacks still follow normal SVG pointer events. Stack layout keeps individual tooltips.

## Settings

The MUI form uses the package's shared title, color, and numeric controls, including draft validation. It exposes layout, configured overlay height, gap, opacity, a child selector, and the selected child's registered settings. Child edits target the child's ID.

Structural controls extract the selected child, move it earlier, or ungroup the composite. They are disabled for host-sourced composites and while the browser is loading. Source restrictions apply to the settings UI; core store actions remain available. Pin a composite to pin the whole row. Children cannot be pinned.

For a custom presentation, call core's `createCompositeModule({ settingsComponent })`. Core's `TrackSettings` component can host a child's existing settings inside that form without adding MUI to core.

Return to [Track modules](README.md).
