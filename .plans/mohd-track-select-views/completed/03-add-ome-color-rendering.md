# Slice 3: Add ome color rendering in the grid and selected tree

## Dependencies

Slice 2: Add the default ome-first MOHD view

## Description

Introduce a MOHD ome config object that normalizes raw ome keys to display labels, placeholder colors, and URL path mappings. Use it to render colored ome squares in the MOHD data grid grouping labels and in the selected tree view so ome values are visually distinct the same way biosample assay labels are.

## Expected Behaviors Addressed

- Ome labels render with a small colored square in the data grid anywhere ome is shown as a grouping label.
- Ome labels render with the same small colored square in the selected tree view.
- Selecting a MOHD leaf creates the correct browser track for that logical entry.

## Acceptance Criteria

- [ ] Raw ome keys are normalized to `ATAC`, `RNA`, and `WGBS` through a shared MOHD config object.
- [ ] MOHD data grid grouping labels show the ome color square.
- [ ] The selected tree shows the same ome color square on MOHD ome nodes.

## QA

1. Open Track Select and go to MOHD.
2. Verify ome groups are labeled `ATAC`, `RNA`, and `WGBS`.
3. Confirm each ome group in the data grid shows a colored square.
4. Select files from at least two different omes.
5. Confirm the selected tree shows matching colored squares for those ome nodes.

## Completion

**Built:** Added MOHD-specific ome icon rendering infrastructure for both the grouped grid and selected tree. MOHD now has a custom grouping cell, a custom tree item, and selected-tree metadata that marks ome nodes for icon rendering.

**Decisions:** Reused the existing assay-oriented tree metadata fields instead of broadening the shared type contract in this slice. Added the MOHD icon helper to the shared MOHD config so label normalization, colors, and rendering stay together.

**Deviations:** The tests avoid importing MUI grid internals directly because that pulls CSS into Vitest in this repo. Instead, slice QA verifies the icon helper output, the folder wiring for MOHD-specific components, and the selected-tree metadata that drives tree icon rendering.

**Files:** Modified `packages/ui/src/TrackSelect/Folders/mohd/shared/config.ts`, `packages/ui/src/TrackSelect/Folders/mohd/shared/createFolder.ts`, `packages/ui/src/TrackSelect/buildSelectedTree.ts`, `packages/ui/test/folders.test.ts`, `packages/ui/test/trackSelectState.test.ts`, and `packages/ui/test/mohdDisplay.test.tsx`. Added `packages/ui/src/TrackSelect/Folders/mohd/shared/MohdGroupingCell.tsx` and `packages/ui/src/TrackSelect/Folders/mohd/shared/MohdTreeItem.tsx`.

**Notes for next slice:** MOHD now carries its own grouping and tree rendering hooks, so the `Site` view can reuse the same ome icon behavior without additional rendering changes.
