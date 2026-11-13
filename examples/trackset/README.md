# Track-set prototype

From the repository root, run:

```sh
pnpm dev:trackset
```

Open http://localhost:4175. This standalone Vite example uses the local core, tracks and UI source, a Regulatory data group of two aggregate ENCODE BigWigs and a cCRE BigBed, a cCRE annotations group containing Human and HepG2 cCRE BigBeds, plus standalone CTCF BigWig and HepG2 cCRE BigBed tracks. It needs internet access to load those public files. It does not need Clerk, PostgreSQL or Redis.

Open either group's Settings action to select child visibility, shared display mode, pinning and per-child settings. Hide/show the parent to preserve child choices. Ungroup and Regroup tracks preserve individual settings. The SP1 region and Wide region buttons change the viewport. The standalone CTCF track starts above the group and HepG2 cCREs below it, so Move up/Move down can move the group past either track. Parent visibility and settings affect only the group.

Core owns one-level membership and lifecycle; `TrackSetSettings` in the UI package supplies the MUI dialog and reuses each module's existing settings panel. Child failures and tooltips remain independent. Drag a track by its left margin to move it between groups or outside them; the blue drop indicator names its destination. Drag the parent title to move the entire group, or use Move up/Move down. Escape cancels a drag. Focus a track margin and press Enter to use Move to group/Remove from group menu actions. Image downloads contain visible child tracks without parent headers.

This prototype does not add nested groups, signal overlays or settings inheritance. Its runtime state is not yet wired into saved web sessions or collection catalogs, and the demo resets on reload. Core's constructor accepts tracks, trackSets and hiddenTrackIds for hosts that implement their own save/restore.

Check or build the example independently:

```sh
pnpm ui exec tsc --noEmit -p ../../examples/trackset/tsconfig.json
pnpm ui exec vite build --config ../../examples/trackset/vite.config.mjs
```
