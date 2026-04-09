# Slice 3: Simplify runtime config and toolbar override handling

## Dependencies

Slice 2: Simplify folder navigation and derived view data

## Description

Replace the current broad mutable runtime config map approach with a clearer model for active folder config plus temporary overrides. End-to-end, folder toolbar controls still update the active grid configuration, but the state flow is more obvious and `TrackSelect` no longer needs to manage config merging details directly.

## Expected Behaviors Addressed

- Folder-specific toolbar controls still work, but the path from toolbar interaction to active grid config is easier to follow.
- The top-level component reads top-to-bottom as layout plus event wiring, not as a mixed state machine.
- `TrackSelect` remains functionally the same from the user's perspective.

## Acceptance Criteria

- [ ] Runtime config state is represented in a simpler model than the current generic per-folder map mutation pattern.
- [ ] `ToolbarExtras` still updates the active folder grid behavior correctly.
- [ ] `TrackSelect` does not directly manage config merging details inline.

## QA

1. Open a folder that exposes toolbar controls.
2. Interact with the toolbar control and confirm the grid updates as expected.
3. Change selections after updating the toolbar state and confirm selection behavior still works.
4. Reset draft selection and confirm toolbar-driven grid behavior still reflects the active config model.
5. Switch folders and return, then confirm the intended runtime config behavior remains consistent.

---

## Completion

**Built:** Replaced the full per-folder runtime-config state with override-only state and extracted runtime-config derivation/update helpers so `TrackSelect` now reads active config through one clearer path.

**Decisions:** Kept toolbar overrides as partial folder config updates for compatibility with existing `ToolbarExtras`; derived full folder configs by merging folder defaults with any saved override only at read time.

**Deviations:** Kept runtime-config state in `TrackSelect` instead of moving it into `useTrackSelectState` so this slice could stay narrowly focused on removing the inline config-merging flow without broadening the hook surface area.

**Files:** `packages/ui/src/TrackSelect/TrackSelect.tsx`, `packages/ui/src/TrackSelect/trackSelectRuntimeConfig.ts`, `packages/ui/src/TrackSelect/trackSelectViewData.ts`, `packages/ui/test/trackSelectState.test.ts`, `.plans/trackselect-readability-refactor/completed/03-simplify-runtime-config-and-toolbar-override-handling.md`

**Notes for next slice:** The main remaining readability work is in `TrackSelect` itself: dialog chrome, toolbar/header rendering, panel layout, and footer actions can still be flattened further now that selection flow, derived view data, and runtime-config handling each have their own seams.
