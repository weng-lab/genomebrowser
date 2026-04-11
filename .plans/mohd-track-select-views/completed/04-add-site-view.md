# Slice 4: Add the site-first MOHD view and verify cross-view behavior

## Dependencies

Slice 3: Add ome color rendering in the grid and selected tree

## Description

Add the `Site` view so the same logical MOHD leaves can be browsed as `site -> ome -> sample`. Ensure the selected tree follows the active view's grouping order and that switching between `Ome` and `Site` preserves coherent selections.

## Expected Behaviors Addressed

- When the user opens the MOHD folder, they can switch between an `Ome` view and a `Site` view.
- In the `Site` view, logical leaves are grouped by site, then ome, then sample.
- Ome labels render with the same small colored square in the selected tree view.
- Selecting a MOHD leaf creates the correct browser track for that logical entry.

## Acceptance Criteria

- [ ] The MOHD folder exposes a `Site` view alongside `Ome`.
- [ ] The `Site` view groups rows as `site -> ome -> sample`.
- [ ] The selected tree reflects the currently active MOHD view hierarchy.

## QA

1. Open Track Select and go to MOHD.
2. Switch from `Ome` to `Site`.
3. Confirm the grouping order changes to site, then ome, then sample.
4. Select files in the `Site` view and confirm they appear in the selected tree under the same hierarchy.
5. Switch back to `Ome` and confirm selections remain intact and the tree updates to the ome-first structure.

## Completion

**Built:** Added the MOHD `Site` view and a MOHD-specific view selector so the folder can switch between `Ome` and `Site`. The selected tree now follows whichever MOHD view is active, and view switching preserves the current selection.

**Decisions:** Used a small folder-owned toggle button group rather than adding generic TrackSelect view-switch UI. Reused the same columns and leaf field for both views and changed only the grouping model, keeping the slice focused on hierarchy switching.

**Deviations:** QA was completed with focused Vitest coverage rather than a manual browser walkthrough. The tests verify both direct selected-tree construction and end-to-end TrackSelect view switching with mocked grid/tree wrappers.

**Files:** Modified `packages/ui/src/TrackSelect/Folders/mohd/shared/createFolder.ts`, `packages/ui/test/folders.test.ts`, `packages/ui/test/trackSelectState.test.ts`, `packages/ui/test/mohdDisplay.test.tsx`, and `packages/ui/test/TrackSelect.test.tsx`. Added `packages/ui/src/TrackSelect/Folders/mohd/shared/MohdViewSelector.tsx`.

**Notes for next slice:** The MOHD plan is fully executed. `Ome` and `Site` now share the same leaf/metadata presentation and the same ome icon behavior, differing only in grouping order.
