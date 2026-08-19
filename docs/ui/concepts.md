# UI concepts

`@weng-lab/genomebrowser-ui` provides higher-level React UI for `@weng-lab/genomebrowser`. Core owns browser runtime state, module infrastructure, validation, and rendering orchestration. `@weng-lab/genomebrowser-tracks` owns the curated first-party modules and UI used specifically by tracks. The UI package owns larger application controls that coordinate with the browser system as a whole.

TrackSelect is currently the main UI subsystem. It lets an application describe available tracks as collections and lets a user reconcile those collections with a runtime track store.

## Data flow

TrackSelect follows one path from application data to browser state:

1. The host passes track collections, a runtime track store hook, and optionally an interaction resolver.
2. TrackSelect reads the store's module registry and validates every collection against schemas derived from that registry.
3. Valid collection entries become grid rows. TrackSelect qualifies row IDs with their collection IDs so entries from different collections cannot collide.
4. When configured, ordered initial track IDs initialize the collection-owned portion of the store. Explicit `initialTrackIds` take precedence over `defaultTrackIds`; with neither, the store is preserved. During this reconciliation, TrackSelect resolves host interactions only for selected collection entries and adapts them to core callbacks.
5. Opening the dialog creates an ordered session draft from collection tracks represented in the store.
6. Collection and view interactions edit only that draft.
7. Submit resolves the ordered draft, resolves interactions for selected collection entries, and replaces the store contents in one atomic validated update.
8. The dialog closes only after the store accepts the update. An optional commit callback then reports the complete ordered collection selection for host-owned persistence. Creation or store validation failures leave the store unchanged, do not notify the callback, and keep the dialog open with an error.

This flow preserves the runtime rule that track state is validated through registered modules. Collection validation and submitted track creation must use the same module registry as the browser that will render the tracks.

## Ownership

The host application owns:

- creation and stable identity of the browser and track stores
- registered track modules
- collection data and stable collection identity
- whether the dialog is open
- optional saved initial selection, product defaults, and persistence
- host interaction behavior and the optional collection-entry interaction resolver
- normal MUI ecosystem setup and theme customization

TrackSelect owns:

- collection parsing and view-field validation
- dialog navigation and the active view for each collection
- the session draft, confirmations, limits, and submission errors
- collection row IDs and the selected-track tree
- conversion of the submitted draft into one track-store change

The runtime track store remains the source of truth for committed browser tracks. The draft is deliberately local to an open TrackSelect session.

Collection metadata remains on the parsed collection for views, grouping, and host integration. It is never copied into runtime track base/config state or persisted selection IDs. A resolved UI callback receives the semantic item, core's current `TrackRuntimeContext`, and a separate collection context containing the owning collection ID, authored track ID, and read-only metadata.

## Session actions and defaults

Cancel, the close button, and backdrop or escape dismissal close the controlled dialog without submitting the draft. Clear changes the draft only and asks for confirmation. On a collection detail screen it clears that collection; on the collection list it clears all collections.

Reset restores the ordered `defaultTrackIds` list into the draft. Without configured defaults, Reset clears the collection selection. Explicit `initialTrackIds` affect initialization only and do not change the Reset target.

Submit atomically replaces the collection-owned portion of the store in draft order. Tracks outside the supplied collections remain first in their existing order. After a successful update, `onCommittedTrackIds` receives only the ordered collection-qualified IDs; initialization and draft actions do not trigger it.

`resolveTrackInteraction` runs only while reconciling selected entries during initialization or Submit. Draft browsing, selection, Clear, Reset, and Cancel do not call it. When omitted, an interaction already present on a reused collection-owned track is preserved. When supplied, its result is authoritative for both new and reused collection-owned tracks: `undefined` clears the interaction, and an object replaces rather than merges callbacks. Resolver or validation failures leave the store unchanged; Submit uses its existing visible error state.

Resolver identity is not part of initialization identity, so changing only the function does not rewrite the store. The adapter captures collection context, but core supplies runtime context when an event occurs. Later base/config mutations therefore reach later callbacks without rerunning the resolver.

## Collection identity and ordering

Collection IDs must be unique, and track IDs must be unique within a collection. TrackSelect encodes row and store identity as `${collectionId}::${trackId}`. This collection-qualified format is a public contract used by `initialTrackIds`, `defaultTrackIds`, and `onCommittedTrackIds`, and prevents collisions when different collections reuse a track ID.

TrackSelect treats a store track whose ID matches a supplied collection-qualified ID as collection-owned, regardless of how the track was created. Collection lookup retains both the qualified ID and owning collection ID so interaction resolution can provide unambiguous collection context. This ID rule is the provenance boundary; TrackSelect does not compare type or configuration to infer ownership. Fixed or otherwise non-collection tracks must not use those reserved IDs because initialization or Submit may reuse or remove them during collection reconciliation.

Each collection has one or more views. The active view controls grid columns, grouping, leaf labels, and the order in which newly selected tracks are submitted. Group order follows first appearance in the collection rows, nested grouping follows the view's `grouping` field order, and rows within the final group retain collection order. Switching views therefore changes the presentation and may change the insertion order of tracks added on Submit.

## MUI boundary

The UI package owns its MUI component composition and default presentation. The host owns its MUI dependency and MUI X license setup and may provide its normal application theme. TrackSelect does not require a package-specific stylesheet or provider. The UI package must not read a build-time license environment variable or configure `LicenseInfo`; doing so would couple the published library to the publisher's build environment instead of the consuming application.

Collection JSON should contain portable data, not React or MUI behavior. Host-only presentation belongs in `columnOverrides`; reusable value-marker rendering is exposed through `withValueMarkers`. Data Grid continues to own grid interaction, grouping expansion, filtering, and column behavior.

## Subsystem map

The package keeps TrackSelect as a deep subsystem with a narrow public surface:

- `src/lib.ts` is the browser-facing public entry point. Keep component exports and the few supported collection helpers here.
- `src/cli.ts` is the public configuration entry point for schema generation.
- `src/trackselect.ts` implements the `trackselect` executable and should remain a thin adapter over public configuration and schema behavior.
- `src/TrackSelect/schema` owns registry-derived runtime validation and JSON Schema generation.
- `src/TrackSelect/collection` owns rows, IDs, views, grouping, ordering, columns, selection operations, and store reconciliation.
- `src/TrackSelect/session` owns the open-session state machine and store submission boundary.
- `src/TrackSelect/layout`, `collectionList`, `selectedTracksTree`, and `dialogs` own component composition and presentation.
- `test/main.tsx` is the manual integration harness; `test/collections` contains its fixtures.
- `scripts` contains repository maintenance scripts for checked-in schemas, not additional package APIs.

Extend the schema layer when changing portable collection data, the collection layer for deterministic data transformations, and the session layer for user workflow. Keep MUI components out of schema and store logic. New public exports should be added only when an application needs a stable capability that cannot be expressed through collections, the existing TrackSelect props, or the runtime store and module APIs.

## Related decisions

The UI package follows the runtime decisions that track state is validated through registered modules, startup stores remain externally initialized, and features expose narrow public APIs. UI ADR 0001 records TrackSelect's collection ownership boundary. See the runtime ADRs in `docs/core/adr/`, especially 0001, 0003, 0006, and 0007, before changing these boundaries.
