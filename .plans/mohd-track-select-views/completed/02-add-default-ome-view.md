# Slice 2: Add the default ome-first MOHD view

## Dependencies

Slice 1: Rebuild MOHD rows around the new flat data model

## Description

Add MOHD folder views and make `Ome` the default browsing path. This view organizes logical leaves as `ome -> site -> sample`, uses `description` as the leaf label, and hides grouped columns so the grid shows the leaf column plus the remaining metadata for each row.

## Expected Behaviors Addressed

- When the user opens the MOHD folder, they can switch between an `Ome` view and a `Site` view.
- In the `Ome` view, logical leaves are grouped by ome, then site, then sample.
- The visible leaf label is `description`, not the raw filename.
- Grouped fields stay hidden in the grid, so the table shows the leaf label plus the remaining metadata columns.

## Acceptance Criteria

- [ ] The MOHD folder exposes a named `Ome` view and uses it as the default active view.
- [ ] The `Ome` view groups rows as `ome -> site -> sample`.
- [ ] The grid hides grouped columns and shows `description` as the leaf/display label.

## QA

1. Open Track Select and go to MOHD.
2. Verify the default active view is `Ome`.
3. Expand the grouped table and confirm the order is ome, then site, then sample, then leaf.
4. Confirm the leaf label shown to the user is `description`.
5. Confirm grouped columns are not duplicated in the visible table columns.

## Completion

**Built:** Added a named default MOHD `Ome` view and made the folder's default grouping ome-first. MOHD now resolves to an `ome -> site -> sample` hierarchy with `description` as the leaf field.

**Decisions:** Kept the slice narrow by exposing a single explicit `Ome` view now and leaving the `Site` view for the next slice. Reused the folder-level `views` contract already used elsewhere in TrackSelect instead of adding MOHD-specific runtime logic.

**Deviations:** QA was completed with focused Vitest coverage rather than a manual browser walkthrough, since the repo guidance explicitly avoids starting the dev server here.

**Files:** Modified `packages/ui/src/TrackSelect/Folders/mohd/shared/columns.tsx`, `packages/ui/src/TrackSelect/Folders/mohd/shared/createFolder.ts`, `packages/ui/test/folders.test.ts`, and `packages/ui/test/trackSelectState.test.ts`.

**Notes for next slice:** The shared ome config and the new `Ome` view are now in place. The next slice can attach ome color rendering to the grouping cell and selected tree without changing the grouping shape.
