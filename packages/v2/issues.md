# v2 cleanup concerns

## Module ownership and registry use

Modules are currently given to both the track store and the `GenomeBrowser` component. That means validation, fetching, rendering, display options, and settings all independently know how to resolve module behavior through the registry.

Concern: the registry is a shallow seam right now. If the track module interface changes, several browser modules need to change together. Consider deepening the registry/module-runtime seam so callers ask for higher-level behavior instead of repeatedly calling `registry.get(...)` and knowing module internals.

## `fetchOnChange` only appears to inspect top-level fields

`fetchOnChange` marks Zod schemas, but `createFetchSignature` currently walks only the top-level module schema fields. Nested fields, such as `bulkbed.datasets[].url`, look like they express fetch invalidation intent but may not affect the generated fetch signature.

Concern: the interface suggests precise cache invalidation, but the implementation may miss nested changes. This is bug-shaped and should be checked before more modules rely on nested `fetchOnChange` fields.

## `bulkbed` is tightly coupled to `bigbed`

The `bulkbed` track imports and adapts `bigbed` internals rather than depending on a clear shared helper seam. It fabricates BigBed-shaped config/data to reuse BigBed behavior.

Concern: `bulkbed` is not fully self-contained as a track module, but the shared BigBed behavior is also not exposed as a deliberate reusable module. Either make the composition explicit behind a stable helper seam or give `bulkbed` its own implementation.

## Pan and overscan behavior leaks through many props

Panning, overscanned render windows, settlement, and SVG transforms are coordinated across `GenomeBrowser`, viewport hooks, `TrackStack`, `TrackFrame`, and overlays. Props such as `contentX`, `contentWidth`, `registerContentGroup`, `panDrag`, and `isPanLocked` expose implementation details across several seams.

Concern: ADR 0003 justifies the behavior, but the implementation has low locality. Changes to pan/settlement behavior require understanding many modules at once.

## `TrackFrame` is overloaded

`TrackFrame` owns track chrome, clipping, title layout, hover overlay, pan hit area, context menu opening, color strip, controls, and swap/drag-clone variants.

Concern: this module has a wide interface and mixes several browser behaviors. It may be worth splitting only when actively changing track chrome, swap, or pan behavior; otherwise avoid a premature extraction.
