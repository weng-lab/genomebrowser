# Ticket 01: Correct grouped track selection behavior

**Status:** Reviewed
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R4, R5, R6
**Blocked by:** None

## Outcome

TrackSelect group checkboxes accurately reflect and control all descendant track selections while the session and runtime store remain leaf-ID-only.

## Scope

Correct the catalog grid's controlled MUI selection boundary, add focused regression coverage for grouped and nested selection behavior, and update the shipped TrackSelect documentation for the corrected interaction.

## Acceptance Criteria

- [x] A group with no selected descendant tracks is unchecked.
- [x] A group with some but not all selectable descendant tracks selected is indeterminate.
- [x] A group with every selectable descendant track selected is checked.
- [x] Selecting a group selects its selectable descendant tracks.
- [x] Deselecting a fully selected group deselects its selectable descendant tracks.
- [x] Group state updates correctly after individual leaf selection and deselection, including nested groups.
- [x] Synthetic group IDs are excluded from the TrackSelect draft, submitted selection, public commit callback, and runtime track store.
- [x] Existing selection limits, ordering, and store reconciliation behavior remain unchanged.
- [x] Focused automated regression coverage exercises the controlled MUI grouping boundary and leaf-only callback boundary.
- [x] `packages/ui/docs/trackSelect.md` describes grouped selection without presenting group IDs as persisted tracks.
- [x] The UI package's required test, build, lint, and format checks pass.

## Verification

Use a small grouped catalog fixture to verify none, partial, full, select-group, deselect-group, individual-leaf, and nested-group states. Assert that the grid-facing behavior is correct and that callbacks leaving the grid contain only catalog-qualified leaf IDs. Run the standard UI package checks documented in `docs/ui/testing.md`. Manually confirm the checkbox transitions in `test/main.tsx` using the user-managed development server if available; do not run `pnpm run dev`.

## Starting Points

- `packages/ui/src/TrackSelect/catalog/catalogGrid.tsx` owns the controlled Data Grid selection model, propagation settings, and filtering of emitted IDs.
- `packages/ui/src/TrackSelect/catalog/catalogSelection.ts` and `packages/ui/src/TrackSelect/session/useTrackSelectState.ts` preserve leaf-only draft selection.
- `packages/ui/test/trackSelectWorkflow.test.tsx` covers the session and store boundary; add MUI-dependent coverage at the narrowest focused component seam instead of reproducing third-party behavior broadly.
- `packages/ui/docs/trackSelect.md` is the shipped user-facing component documentation.
- `docs/ui/concepts.md`, UI ADR 0001, `docs/conventions.md`, and `docs/ui/testing.md` define the ownership, implementation, and verification constraints.

## Constraints

- Do not persist or expose synthetic MUI group IDs.
- Preserve catalog-qualified leaf IDs as the TrackSelect ownership and reconciliation boundary.
- Let MUI own grid grouping and interaction semantics; do not move grouping behavior into session or store logic.
- Do not change public APIs or catalog schemas.
- Do not start the development server.

## Out of Scope

- Unrelated TrackSelect layout, ordering, limits, or submission changes.
- New public configuration for group-selection behavior.
