# v2 cleanup concerns

## Module ownership and registry use

Modules are currently given to both the track store and the `GenomeBrowser` component. That means validation, fetching, rendering, display options, and settings all independently know how to resolve module behavior through the registry.

Concern: the registry is a shallow seam right now. If the track module interface changes, several browser modules need to change together. Consider deepening the registry/module-runtime seam so callers ask for higher-level behavior instead of repeatedly calling `registry.get(...)` and knowing module internals.

## Pan and overscan behavior leaks through many props

Panning, overscanned render windows, settlement, and SVG transforms are coordinated across `GenomeBrowser`, viewport hooks, `TrackStack`, `TrackFrame`, and overlays. Props such as `contentX`, `contentWidth`, `registerContentGroup`, `panDrag`, and `isPanLocked` expose implementation details across several seams.

Concern: ADR 0003 justifies the behavior, but the implementation has low locality. Changes to pan/settlement behavior require understanding many modules at once.

## `TrackFrame` is overloaded

`TrackFrame` owns track chrome, clipping, title layout, hover overlay, pan hit area, context menu opening, color strip, controls, and swap/drag-clone variants.

Concern: this module has a wide interface and mixes several browser behaviors. It may be worth splitting only when actively changing track chrome, swap, or pan behavior; otherwise avoid a premature extraction.
