# Bug: TreeView Selection State

## Description

When attempting to remove a track from the tree view component, it gets removed but replaced at the end of the list of IDs. The expected behavior is for the tree view to remove the selection in both the data grid and the tree view, while also reflecting this change in the zustand store. The zustand store should the one source of truth for both components. 

## Attempted Fixes

### 1. Only selectedIds in store
Keep track of only `selectedIds` in store and look up row information through `selectedIds` and `rowById` in `buildTreeView()`.

### 2. Both selectedIds and selectedRows with shared setters
Keep track of both `selectedIds` and `selectedRows` but have the same setters for them.

### 3. No store, simple array for selectedIds
Remove store altogether and just try to keep track of `selectedIds` through a simple array and look up row information through `rowIds`.

**Result:** Doesn't remove items from TreeView properly. The item you try to remove just keeps being added back, specifically when you add all of the items in a grouping. However, it keeps track of state when you toggle between views.

### 4. Both selectedIds and selectedRows with separate setters
Keep track of both `selectedIds` and `selectedRows` in store and have separate setters for each of them.

**Result:** Removes items successfully except when trying to remove assay folder level on sorted assay view. However, it doesn't keep track of selected states properly when you toggle between sorting methods (i.e., when you remove something on one view, it comes back when you toggle to another view).
