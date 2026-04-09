# Slice 4: Final readability pass on `TrackSelect` composition

## Dependencies

Slice 3: Simplify runtime config and toolbar override handling

## Description

Do a final pass to make `TrackSelect` read like a composition component instead of a controller. End-to-end, behavior stays unchanged, but the file becomes a straightforward layout of dialog sections, action buttons, and child components backed by a small state surface.

## Expected Behaviors Addressed

- `TrackSelect` remains functionally the same from the user's perspective.
- The top-level component reads top-to-bottom as layout plus event wiring, not as a mixed state machine.
- Folder-specific toolbar controls still work, but the path from toolbar interaction to active grid config is easier to follow.

## Acceptance Criteria

- [ ] `TrackSelect` is substantially smaller and easier to scan than before the refactor.
- [ ] Remaining inline logic in `TrackSelect` is mostly rendering decisions, not business logic.
- [ ] Component-level integration coverage still confirms the full modal flow works.

## QA

1. Open the modal and exercise the full flow: enter a folder, select tracks, remove one from the active tree, use Clear, use Reset, and Submit.
2. Confirm all behaviors match pre-refactor expectations.
3. Read through `TrackSelect.tsx` and verify it now reads primarily as layout and wiring rather than dense state management.
4. Run the relevant UI tests and confirm the full TrackSelect flow still passes.

---

## Completion

Pending.
