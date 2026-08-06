# Ticket 01: Establish semantic settings rows

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R5, R6, R7, R15
**Blocked by:** None

## Outcome

Base track settings present the intended two semantic field pairs at normal modal width, stack safely in constrained containers, and establish reusable layout behavior for later track-specific settings work.

## Scope

Update the shared settings layout primitives only as needed to express a related field row and a full-width item. Apply that behavior to the MUI base settings so Title and Color share one responsive row and Display mode and Height share another. Tighten shared form spacing modestly without changing host typography.

## Acceptance Criteria

- [x] Title and Color appear in source order as one row when both fields have usable width and stack in the same order when constrained.
- [x] Display mode and Height appear in source order as one row when both fields are present and stack when constrained.
- [x] When Display mode is omitted because the module has only one mode, Height uses a natural field width without an empty placeholder cell.
- [x] Shared layout supports deliberate full-row controls without forcing every settings form into a fixed column matrix.
- [x] Alerts and validation messages retain full available width and their existing associations and behavior.
- [x] Shared settings gaps are modestly tightened and controls remain `size="small"`; no global theme or typography override is introduced.
- [x] The layout does not create horizontal page overflow at narrow container or viewport widths.
- [x] Base setting update timing, validation, labels, and mutation results remain unchanged.

## Verification

Extend base settings component tests for field order, updates, validation, and the one-display-mode case. Verify wide and constrained rendering through the repository's available browser or visual test seam; do not rely on jsdom layout calculations alone. Run relevant UI typecheck, lint, tests, and formatting checks.

## Starting Points

- `packages/ui/src/TrackSettings/trackBaseSettings.tsx`
- `packages/ui/src/TrackSettings/trackSettingsFieldGrid.tsx`
- `packages/ui/src/TrackSettings/trackSettingsLayout.tsx`
- `packages/ui/src/TrackSettings/trackSettingsSection.tsx`
- `packages/ui/test/trackBaseSettings.test.tsx`
- `DESIGN.md`, especially Forms and settings, Track settings, and Responsive behavior

The current `auto-fit` grid is useful for generic peer controls but does not by itself preserve semantic row boundaries at every width. Prefer the smallest API that makes relationship and full-row intent explicit.

## Constraints

- `packages/core` retains ownership of the modal shell; this ticket changes UI form composition only.
- Responsive behavior must follow container width because the browser is embeddable.
- DOM, visual, and keyboard order must agree.
- Do not impose a package-wide MUI theme.

## Out of Scope

- Custom color picker behavior or color validation.
- Track-specific settings reshuffling.
- Resizable modal behavior or drag-boundary changes.
