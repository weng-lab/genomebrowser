# Track-set prototype

From the repository root, run:

```sh
pnpm dev:trackset
```

Open http://localhost:4175. This standalone Vite example uses the local core, tracks and UI source, a Regulatory data track set of two aggregate ENCODE BigWigs and a cCRE BigBed, a cCRE annotations track set containing Human and HepG2 cCRE BigBeds, plus standalone CTCF BigWig and HepG2 cCRE BigBed tracks. It needs internet access to load those public files. It does not need Clerk, PostgreSQL or Redis.

Open either track set's Settings action to select child visibility, shared display mode and per-child settings. Use the header arrows to move the track set and the pin icon to pin it; the settings gear sits at the far right. Hide/show the parent to preserve child choices. Remove track set and Create regulatory track set preserve individual settings. The SP1 region and Wide region buttons change the viewport. The standalone CTCF track starts above the track set and HepG2 cCREs below it, so Move up/Move down can move the track set past either track. Parent visibility and settings affect only the track set.

Core owns one-level membership and lifecycle and supplies the default MUI settings dialog, reusing each module's existing settings panel. The host's ThemeProvider styles the dialog, track-set headers and outlines. Child failures and tooltips remain independent. Drag a track by its left margin to move it between track sets or outside them; the themed drop indicator names its destination. Drag the parent title to move the entire track set, or use Move up/Move down. Escape cancels a drag. Focus a track margin and press Enter to use Move to track set/Remove from track set menu actions. Image downloads contain visible child tracks without parent headers.

This prototype does not add nested track sets, signal overlays or settings inheritance. The web app persists track-set state in saved sessions; this standalone demo resets on reload. Collection catalogs remain separate from runtime track sets. Core's constructor accepts tracks, trackSets and hiddenTrackIds for hosts that implement their own save/restore.

Check or build the example independently:

```sh
pnpm ui exec tsc --noEmit -p ../../examples/trackset/tsconfig.json
pnpm ui exec vite build --config ../../examples/trackset/vite.config.mjs
```
