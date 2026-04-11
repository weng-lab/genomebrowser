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
