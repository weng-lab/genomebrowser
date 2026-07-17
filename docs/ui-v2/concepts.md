# UI v2 Concepts

`@weng-lab/genomebrowser-ui-v2` provides higher-level React UI for `@weng-lab/genomebrowser-v2`. The v2 package owns browser runtime state, track modules, validation, and rendering. UI v2 consumes those public boundaries rather than duplicating them.

TrackSelect is currently the main UI v2 subsystem. It lets an application describe available tracks as catalogs and lets a user reconcile those catalogs with a v2 track store.

## Data flow

TrackSelect follows one path from application data to browser state:

1. The host passes track catalogs and a v2 track store hook.
2. TrackSelect reads the store's module registry and validates every catalog against schemas derived from that registry.
3. Valid catalog entries become grid rows. TrackSelect qualifies row IDs with their catalog IDs so entries from different catalogs cannot collide.
4. When configured, the ordered default track IDs immediately initialize the catalog-owned portion of the store.
5. Opening the dialog creates an ordered session draft from catalog tracks represented in the store.
6. Catalog and view interactions edit only that draft.
7. Submit resolves the ordered draft and replaces the store contents in one atomic validated update.
8. The dialog closes only after the store accepts the update. Creation or store validation failures leave the store unchanged and keep the dialog open with an error.

This flow preserves the v2 rule that track state is validated through registered modules. Catalog validation and submitted track creation must use the same module registry as the browser that will render the tracks.

## Ownership

The host application owns:

- creation and stable identity of the browser and track stores
- registered track modules
- catalog data and stable catalog identity
- whether the dialog is open
- the configured default track-store list
- normal MUI ecosystem setup and theme customization

TrackSelect owns:

- catalog parsing and view-field validation
- dialog navigation and the active view for each catalog
- the session draft, confirmations, limits, and submission errors
- catalog row IDs and the selected-track tree
- conversion of the submitted draft into one track-store change

The v2 track store remains the source of truth for committed browser tracks. The draft is deliberately local to an open TrackSelect session.

## Session actions and defaults

Cancel, the close button, and backdrop or escape dismissal close the controlled dialog without submitting the draft. Clear changes the draft only and asks for confirmation. On a catalog detail screen it clears that catalog; on the catalog list it clears all catalogs.

Reset restores the ordered `defaultTrackIds` list into the draft. Without configured defaults, Reset restores the catalog tracks currently represented in the store.

Submit atomically replaces the catalog-owned portion of the store in draft order. Tracks outside the supplied catalogs remain first in their existing order.

## Catalog identity and ordering

Catalog IDs must be unique, and track IDs must be unique within a catalog. TrackSelect encodes row and store identity as `${catalogId}::${trackId}`. This catalog-qualified format is a public contract used by `defaultTrackIds` and prevents collisions when different catalogs reuse a track ID.

TrackSelect treats a store track whose ID matches a supplied catalog-qualified ID as catalog-owned, regardless of how the track was created. This ID rule is the provenance boundary; TrackSelect does not compare type or configuration to infer ownership. Fixed or otherwise non-catalog tracks must not use those reserved IDs because initialization or Submit may reuse or remove them during catalog reconciliation.

Each catalog has one or more views. The active view controls grid columns, grouping, leaf labels, and the order in which newly selected tracks are submitted. Group order follows first appearance in the catalog rows, nested grouping follows the view's `grouping` field order, and rows within the final group retain catalog order. Switching views therefore changes the presentation and may change the insertion order of tracks added on Submit.

## MUI boundary

UI v2 owns its MUI component composition and default presentation. The host owns its MUI dependency setup and may provide its normal application theme. TrackSelect does not require a UI-v2-specific stylesheet or provider.

Catalog JSON should contain portable data, not React or MUI behavior. Host-only presentation belongs in `columnOverrides`; reusable value-marker rendering is exposed through `withValueMarkers`. Data Grid continues to own grid interaction, grouping expansion, filtering, and column behavior.

## Subsystem map

The package keeps TrackSelect as a deep subsystem with a narrow public surface:

- `src/lib.ts` is the browser-facing public entry point. Keep component exports and the few supported catalog helpers here.
- `src/cli.ts` is the public configuration entry point for schema generation.
- `src/trackselect.ts` implements the `trackselect` executable and should remain a thin adapter over public configuration and schema behavior.
- `src/TrackSelect/schema` owns registry-derived runtime validation and JSON Schema generation.
- `src/TrackSelect/catalog` owns rows, IDs, views, grouping, ordering, columns, selection operations, and store reconciliation.
- `src/TrackSelect/session` owns the open-session state machine and store submission boundary.
- `src/TrackSelect/layout`, `catalogList`, `selectedTracksTree`, and `dialogs` own component composition and presentation.
- `test/main.tsx` is the manual integration harness; `test/catalogs` contains its fixtures.
- `scripts` contains repository maintenance scripts for checked-in schemas, not additional package APIs.

Extend the schema layer when changing portable catalog data, the catalog layer for deterministic data transformations, and the session layer for user workflow. Keep MUI components out of schema and store logic. New public exports should be added only when an application needs a stable capability that cannot be expressed through catalogs, the existing TrackSelect props, or the v2 store and module APIs.

## Related decisions

UI v2 follows the v2 decisions that track state is validated through registered modules, startup stores remain externally initialized, and features expose narrow public APIs. See the v2 ADRs in `docs/v2/adr/`, especially 0001, 0003, 0006, and 0007, before changing these boundaries.
