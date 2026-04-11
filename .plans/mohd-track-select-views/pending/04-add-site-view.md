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
