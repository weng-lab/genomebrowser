# Correct TrackSelect Group Selection State

**Status:** Ready

## Problem

Selecting a grouped row in the TrackSelect catalog grid selects all of its descendant tracks, but the group checkbox remains indeterminate instead of appearing fully selected. This gives users contradictory feedback and prevents the fully selected group checkbox from serving as a clear way to deselect the whole group.

## Desired Outcome

Grouped-row checkboxes accurately summarize their descendant track selection and support selecting or deselecting the complete group, while TrackSelect continues to keep synthetic grid group IDs out of its draft and runtime track store.

## Current State

The catalog grid controls MUI Data Grid Premium with catalog-qualified leaf track IDs from the TrackSelect session draft. Selection events are filtered to those valid leaf IDs before updating the draft, preserving the catalog ownership boundary defined by UI ADR 0001. Descendant selection propagation is enabled, but parent propagation is disabled, so a controlled leaf-only model cannot represent a fully selected group to MUI.

## Requirements

- **R1:** A group row must appear checked when all of its selectable descendant leaf tracks are selected.
- **R2:** A group row must appear indeterminate only when some, but not all, of its selectable descendant leaf tracks are selected, and unchecked when none are selected.
- **R3:** Selecting an unchecked or partially selected group must select its selectable descendant leaf tracks, and deselecting a fully selected group must deselect those tracks.
- **R4:** The behavior must apply at every level of nested catalog grouping and remain correct when leaf selections change individually.
- **R5:** TrackSelect session state, submitted catalog selection, and the runtime track store must contain only valid catalog-qualified leaf track IDs; synthetic MUI group IDs must not cross the grid boundary.
- **R6:** User-facing TrackSelect documentation must describe grouped selection and clarify that groups are a grid interaction rather than persisted tracks.

## Technical Decisions

- Preserve the existing ownership boundary: catalog-qualified leaf track IDs are the only selection IDs owned by TrackSelect or persisted to the runtime store.
- Treat group selection as grid presentation and interaction state derived from descendant leaves. The MUI-facing controlled selection may represent group state as needed, but the application-facing selection callback must remain leaf-only.
- Continue to let MUI Data Grid own grouping and row-selection interaction semantics rather than duplicating group traversal in the session or store layers.
- This change does not alter the public TrackSelect API, catalog schema, submitted ordering, or store reconciliation contract and does not require an ADR.

## Verification Strategy

Add focused regression coverage at the MUI component boundary because the defect depends on controlled Data Grid grouping behavior. Cover unchecked, partially selected, fully selected, group selection, full-group deselection, individual leaf changes, and nested grouping. Assert separately that selection emitted to TrackSelect remains leaf-only. Use the UI package's standard test, build, lint, and format checks, and confirm the grouped checkbox behavior in the existing manual TrackSelect harness without starting the development server automatically.

## Out of Scope

- Changes to TrackSelect submission ordering, selection limits, catalog schemas, or store reconciliation.
- Persisting group identities or introducing group IDs into public callbacks.
- Replacing MUI grouping or implementing a separate grouping state model outside the grid.

## Risks and Edge Cases

- Controlled MUI selection propagation can emit synthetic group IDs or require a propagated presentation model; filtering at the wrong point can restore the visual defect or leak group IDs into domain state.
- Nested groups must derive their state from all selectable descendant leaves, not only direct child group rows.
- Selection-limit rejection must continue to permit deselection and must not leave the visual group state inconsistent with the accepted draft.
