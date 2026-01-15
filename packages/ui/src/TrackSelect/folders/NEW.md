# LLM Implementation Guide: Adding a New Data Folder to TrackSelect

## Overview

This guide is optimized for LLM assistants to implement a new data folder in the TrackSelect component. When the user provides JSON data files, follow this guide step-by-step to create a fully functional folder.

---

## Prerequisites

**Before starting, obtain from the user:**

1. **JSON data file(s)** - The track data for the folder
2. **Folder name** - What to call this folder (e.g., "Genes", "Variants", "Regulatory Elements")
3. **Assembly(ies)** - Which genome assemblies to support (GRCh38, mm10, or both)
4. **Grouping hierarchy** - How should data be organized in the UI (e.g., Category → Subcategory → Item)

**Analyze the JSON data to determine:**

- Available fields for grouping
- Unique identifier field
- Display name field
- URL field for track files
- Any fields that need special formatting or icons

---

## Implementation Steps

### Step 1: Analyze the Data Structure

**ACTION:** Examine the provided JSON file to understand:

1. Top-level structure (array of tracks? nested objects?)
2. Fields available for grouping (2-3 levels recommended)
3. Leaf-level items (individual tracks)
4. Any fields that need transformation/formatting

**Example JSON structure to look for:**

```json
{
  "tracks": [
    {
      "id": "track-001",
      "name": "...",
      "category": "...",
      "subcategory": "...",
      "url": "https://...",
      "metadata": {...}
    }
  ]
}
```

### Step 2: Create Directory Structure

**PATH:** `packages/ui/src/TrackSelect/folders/{folder-name}/`

**CREATE these directories and files:**

```
{folder-name}/
├── data/
│   └── human.json          # (and/or mouse.json)
├── shared/
│   ├── types.ts           # REQUIRED
│   ├── columns.tsx        # REQUIRED
│   ├── treeBuilder.ts     # REQUIRED
│   ├── createFolder.ts    # REQUIRED
│   ├── constants.tsx      # OPTIONAL (if you have icons/colors/mappings)
│   ├── GroupingCell.tsx   # OPTIONAL (for custom rendering)
│   ├── TreeItem.tsx       # OPTIONAL (for custom tree items)
│   └── Toolbar.tsx        # OPTIONAL (for view toggles/filters)
└── human.ts               # REQUIRED (and/or mouse.ts)
```

### Step 3: Define TypeScript Types

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/types.ts`

**TEMPLATE:**

```typescript
/**
 * Types for {folder-name} folder data
 */

/**
 * Track information from the JSON data (raw structure)
 */
export type {YourName}TrackInfo = {
  // Map exactly to your JSON structure
  id: string;
  name: string;
  // ... all other fields from JSON
};

/**
 * Row format for DataGrid (flattened structure)
 * - One row per selectable item
 * - Include all fields needed for display and grouping
 */
export type {YourName}RowInfo = {
  id: string;                    // Unique identifier (REQUIRED)
  groupField1: string;           // Top-level grouping field
  groupField2?: string;          // Second-level grouping field (optional)
  displayName: string;           // Display name
  url: string;                   // Track URL
  // ... other display fields
};

/**
 * Structure of the JSON data file
 */
export type {YourName}DataFile = {
  tracks: {YourName}TrackInfo[];
};
```

**RULES:**

- RowInfo must have an `id` field
- Include all fields you want to display or group by
- Keep field names camelCase
- Add JSDoc comments for clarity

**REFERENCE:** See `biosamples/shared/types.ts` for a real example with nested assay data.

### Step 4: Create Column Definitions

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/columns.tsx`

**TEMPLATE:**

```typescript
import { GridColDef } from "@mui/x-data-grid-premium";
import { Stack, capitalize } from "@mui/material";
import { {YourName}RowInfo } from "./types";

// Define each column
const groupField1Col: GridColDef<{YourName}RowInfo> = {
  field: "groupField1",
  headerName: "Group 1",
  type: "singleSelect",  // Optional: for filtering
  valueOptions: [...],   // Optional: list of possible values
  renderCell: (params) => {
    // Custom rendering for group rows
    if (params.rowNode.type === "group") {
      return <div><b>{params.value}</b></div>;
    }
    // Rendering for leaf rows
    return <div>{params.value}</div>;
  },
};

const displayNameCol: GridColDef<{YourName}RowInfo> = {
  field: "displayName",
  headerName: "Name",
  valueFormatter: (value) => value && capitalize(value),
  maxWidth: 300,
};

// ... define all columns

/**
 * Default columns for DataGrid
 * Order matters: left to right display order
 */
export const defaultColumns: GridColDef<{YourName}RowInfo>[] = [
  groupField1Col,
  groupField2Col,
  displayNameCol,
  // ... other columns
];

/**
 * Default grouping model - defines hierarchy
 * - First field = top-level groups
 * - Last field = bottom-level groups (before leaf)
 */
export const defaultGroupingModel = ["groupField1", "groupField2"];

/**
 * Leaf field - the lowest level field that makes each row unique
 * This is typically NOT in the groupingModel
 */
export const defaultLeafField = "id";
```

**RULES:**

- Column order in array = display order in UI
- `groupingModel` should match your desired hierarchy (2-3 levels recommended)
- `leafField` should uniquely identify each row
- Use `renderCell` for custom rendering in groups vs leaf rows
- Always check `params.rowNode.type === "group"` before custom rendering

**REFERENCE:** See `biosamples/shared/columns.tsx` for examples of:

- Custom icon rendering (`AssayIcon`)
- Multiple column sets for view toggling
- Value formatters and type definitions

**OPTIONAL - Multiple View Modes:**
If you want a toggle (like the biosamples "Sort by assay"), create additional column sets:

```typescript
export const alternateColumns: GridColDef<{YourName}RowInfo>[] = [...];
export const alternateGroupingModel = ["differentField", "groupField1"];
export const alternateLeafField = "id";
```

### Step 5: Create Tree Builder

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/treeBuilder.ts`

**TEMPLATE:**

```typescript
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { {YourName}RowInfo } from "./types";

/**
 * Builds hierarchical tree for the TreeView panel (selected items)
 * Hierarchy should match your groupingModel
 *
 * @param selectedIds - Array of selected row IDs
 * @param rowById - Map of row ID to row data
 * @param rootLabel - Label for the root node
 * @returns Tree structure for RichTreeView
 */
export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, {YourName}RowInfo>,
  rootLabel: string = "{Your Folder Name}"
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  // Root node
  const root: TreeViewBaseItem<ExtendedTreeItemProps> = {
    id: "root",
    label: rootLabel,
    icon: "folder",
    children: [],
    allExpAccessions: [],
  };

  // Maps to track nodes at each level
  const level1Map = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();
  const level2Map = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();

  // Get selected rows
  const selectedRows = selectedIds.reduce<{YourName}RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  // Build tree hierarchy
  selectedRows.forEach((row) => {
    // Level 1: groupField1
    const level1Key = row.groupField1;
    let level1Node = level1Map.get(level1Key);
    if (!level1Node) {
      level1Node = {
        id: level1Key,
        label: row.groupField1,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      level1Map.set(level1Key, level1Node);
      root.children!.push(level1Node);
    }

    // Level 2: groupField2 (if applicable)
    const level2Key = `${row.groupField1}-${row.groupField2}`;
    let level2Node = level2Map.get(level2Key);
    if (!level2Node) {
      level2Node = {
        id: level2Key,
        label: row.groupField2,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      level1Node.children!.push(level2Node);
      level2Map.set(level2Key, level2Node);
    }

    // Leaf: individual track
    const leafNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.id,
      label: row.displayName,
      icon: "removeable",
      children: [],
      allExpAccessions: [row.id],
    };
    level2Node.children!.push(leafNode);

    // Propagate IDs up the tree
    level1Node.allExpAccessions!.push(row.id);
    level2Node.allExpAccessions!.push(row.id);
  });

  return [root];
}
```

**RULES:**

- Tree structure must match your `groupingModel` hierarchy
- Each node needs: `id`, `label`, `icon`, `children`, `allExpAccessions`
- `icon: "removeable"` enables the remove button on tree items
- `allExpAccessions` tracks all descendant leaf IDs (for bulk removal)
- Leaf nodes should have `allExpAccessions: [row.id]`

**REFERENCE:** See `biosamples/shared/treeBuilder.ts` for:

- `buildTreeView()` - 2-level hierarchy (Ontology → DisplayName)
- `buildSortedAssayTreeView()` - 3-level hierarchy (Assay → Ontology → DisplayName)
- Optional sorting using predefined type arrays

### Step 6: Create Folder Factory

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/createFolder.ts`

**TEMPLATE:**

```typescript
import { capitalize } from "@mui/material";
import { FolderDefinition } from "../../types";
import { {YourName}DataFile, {YourName}RowInfo, {YourName}TrackInfo } from "./types";
import { defaultColumns, defaultGroupingModel, defaultLeafField } from "./columns";
import { buildTreeView } from "./treeBuilder";

/**
 * Transforms a single track from JSON into row(s) for DataGrid
 * Flatten any nested structures here
 */
function flattenTrackIntoRows(track: {YourName}TrackInfo): {YourName}RowInfo[] {
  // If your data is already flat (one track = one row):
  return [{
    id: track.id,
    groupField1: capitalize(track.groupField1),
    groupField2: capitalize(track.groupField2),
    displayName: track.name,
    url: track.url,
    // ... map all other fields
  }];

  // If your data is nested (one track = multiple rows):
  // return track.items.map(item => ({
  //   id: item.id,
  //   groupField1: capitalize(track.category),
  //   displayName: item.name,
  //   url: item.url,
  //   // ...
  // }));
}

/**
 * Transforms raw JSON data into flattened rows and lookup map
 */
function transformData(data: {YourName}DataFile): {
  rows: {YourName}RowInfo[];
  rowById: Map<string, {YourName}RowInfo>;
} {
  const rows = data.tracks.flatMap(flattenTrackIntoRows);
  const rowById = new Map<string, {YourName}RowInfo>(
    rows.map((row) => [row.id, row])
  );
  return { rows, rowById };
}

export interface Create{YourName}FolderOptions {
  id: string;
  label: string;
  data: {YourName}DataFile;
}

/**
 * Factory function that creates a FolderDefinition
 */
export function create{YourName}Folder(
  options: Create{YourName}FolderOptions
): FolderDefinition<{YourName}RowInfo> {
  const { id, label, data } = options;
  const { rowById } = transformData(data);

  return {
    id,
    label,
    rowById,
    getRowId: (row) => row.id,

    // Default view configuration
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,

    // Tree builder for selected items panel
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label),

    // Optional: Custom components (uncomment if created)
    // ToolbarExtras: {YourName}Toolbar,
    // GroupingCellComponent: {YourName}GroupingCell,
    // TreeItemComponent: {YourName}TreeItem,
  };
}
```

**RULES:**

- `flattenTrackIntoRows` must return an array (even if just one item)
- Every row must have a unique `id`
- Use `capitalize()` for consistent formatting
- `rowById` Map is the single source of truth

**REFERENCE:** See `biosamples/shared/createFolder.ts` for:

- One-to-many flattening (one track with multiple assays)
- Using `formatAssayType()` for data normalization

### Step 7: Create Assembly-Specific Export

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/human.ts`

**TEMPLATE:**

```typescript
import { create{YourName}Folder } from "./shared/createFolder";
import humanData from "./data/human.json";
import { {YourName}DataFile } from "./shared/types";

/**
 * {Description of what this folder contains}
 *
 * For GRCh38 assembly.
 */
export const human{YourName}Folder = create{YourName}Folder({
  id: "human-{folder-name}",
  label: "{Display Label}",
  data: humanData as {YourName}DataFile,
});
```

**For mouse (if applicable):**
**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/mouse.ts`

```typescript
import { create{YourName}Folder } from "./shared/createFolder";
import mouseData from "./data/mouse.json";
import { {YourName}DataFile } from "./shared/types";

export const mouse{YourName}Folder = create{YourName}Folder({
  id: "mouse-{folder-name}",
  label: "{Display Label}",
  data: mouseData as {YourName}DataFile,
});
```

**REFERENCE:** See `biosamples/human.ts` and `biosamples/mouse.ts` for minimal assembly-specific exports.

### Step 8: Register the Folder

**FILE:** `packages/ui/src/TrackSelect/folders/index.ts`

**ACTION:** Update the imports and foldersByAssembly export:

```typescript
import { Assembly, FolderDefinition } from "./types";
import { humanBiosamplesFolder } from "./biosamples/human";
import { mouseBiosamplesFolder } from "./biosamples/mouse";
import { human{YourName}Folder } from "./{folder-name}/human";  // ADD THIS

export {
  type Assembly,
  type FolderDefinition,
  type FolderRuntimeConfig,
} from "./types";

export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [humanBiosamplesFolder, human{YourName}Folder],  // ADD YOUR FOLDER
  mm10: [mouseBiosamplesFolder],
};
```

---

## Optional: Custom Components

### Optional 1: Constants and Icons

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/constants.tsx`

**USE WHEN:** You have categories that need color-coding or special icons

**TEMPLATE:**

```typescript
import { Box } from "@mui/material";

// List of all category values (for ordering and validation)
export const categoryTypes = ["Category1", "Category2", "Category3"];

// Color mapping for categories
export const categoryColorMap: { [key: string]: string } = {
  Category1: "#ff0000",
  Category2: "#00ff00",
  Category3: "#0000ff",
};

/**
 * Creates icon for a category
 */
export function CategoryIcon(type: string) {
  const color = categoryColorMap[type];
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "20%",
        bgcolor: color,
      }}
    />
  );
}

/**
 * Format category names from JSON to display format
 */
const categoryJsonToDisplay: Record<string, string> = {
  cat1: "Category1",
  cat2: "Category2",
};

export function formatCategoryType(jsonKey: string): string {
  return categoryJsonToDisplay[jsonKey.toLowerCase()] ?? jsonKey;
}
```

**REFERENCE:** See `biosamples/shared/constants.tsx` for:

- Color mapping for assay types
- `AssayIcon()` component
- `formatAssayType()` normalization function

### Optional 2: Custom Grouping Cell

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/GroupingCell.tsx`

**USE WHEN:** You want custom rendering in the DataGrid (icons, special formatting, etc.)

**TEMPLATE:**

```typescript
import { Stack, Tooltip, Box, IconButton } from "@mui/material";
import { GridRenderCellParams, useGridApiContext, GridGroupNode } from "@mui/x-data-grid-premium";
import { CategoryIcon } from "./constants";  // If you have icons
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function {YourName}GroupingCell(params: GridRenderCellParams) {
  const apiRef = useGridApiContext();
  const isGroup = params.rowNode.type === "group";
  const groupNode = params.rowNode as GridGroupNode;
  const isExpanded = isGroup ? groupNode.childrenExpanded : false;
  const groupingField = isGroup ? groupNode.groupingField : null;
  const depth = params.rowNode.depth ?? 0;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    apiRef.current.setRowChildrenExpansion(params.id, !isExpanded);
  };

  const renderContent = () => {
    const value = String(params.value ?? "");

    // Custom rendering for specific grouping field with icons
    if (isGroup && groupingField === "categoryField") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, overflow: "hidden" }}>
          <CategoryIcon value={value} />
          <Tooltip title={value} placement="top-start" enterDelay={500}>
            <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "bold" }}>
              {params.formattedValue}
            </Box>
          </Tooltip>
        </Stack>
      );
    }

    // Default rendering for other groups
    if (isGroup) {
      return (
        <Tooltip title={value} placement="top-start" enterDelay={500}>
          <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: "bold" }}>
            {params.formattedValue}
          </Box>
        </Tooltip>
      );
    }

    // Leaf row rendering
    return (
      <Tooltip title={value} placement="top-start" enterDelay={500}>
        <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {params.formattedValue}
        </Box>
      </Tooltip>
    );
  };

  const indentLevel = depth * 2;

  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%", ml: indentLevel }}>
      {isGroup && (
        <IconButton size="small" onClick={handleExpandClick} sx={{ mr: 0.5 }}>
          {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      )}
      {renderContent()}
    </Box>
  );
}
```

**Then update createFolder.ts:**

```typescript
import {YourName}GroupingCell from "./GroupingCell";

export function create{YourName}Folder(...) {
  return {
    // ...
    GroupingCellComponent: {YourName}GroupingCell,  // ADD THIS
  };
}
```

**REFERENCE:** See `biosamples/shared/BiosampleGroupingCell.tsx` for:

- Expand/collapse functionality
- Icon rendering based on grouping field
- Tooltip support with text truncation
- Proper indentation based on depth

### Optional 3: Custom Tree Item

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/TreeItem.tsx`

**USE WHEN:** You want custom icons or rendering in the TreeView

**TEMPLATE:**

```typescript
import React from "react";
import { CustomTreeItem } from "../../../TreeView/CustomTreeItem";
import { CustomTreeItemProps } from "../../../types";
import { CategoryIcon } from "./constants";

export const {YourName}TreeItem = React.forwardRef<HTMLLIElement, CustomTreeItemProps>(
  function {YourName}TreeItem(props, ref) {
    return <CustomTreeItem {...props} ref={ref} renderIcon={CategoryIcon} />;
  }
);
```

**Then update createFolder.ts:**

```typescript
import { {YourName}TreeItem } from "./TreeItem";

export function create{YourName}Folder(...) {
  return {
    // ...
    TreeItemComponent: {YourName}TreeItem,  // ADD THIS
  };
}
```

**REFERENCE:** See `biosamples/shared/BiosampleTreeItem.tsx` - a simple wrapper that passes `AssayIcon` as the icon renderer.

### Optional 4: Toolbar with View Toggle

**FILE:** `packages/ui/src/TrackSelect/folders/{folder-name}/shared/Toolbar.tsx`

**USE WHEN:** You want multiple view modes (like "Sort by assay")

**TEMPLATE:**

```typescript
import { FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { FolderRuntimeConfig } from "../../types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
  alternateColumns,
  alternateGroupingModel,
  alternateLeafField,
} from "./columns";

export interface {YourName}ToolbarProps {
  updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
}

export function {YourName}Toolbar({ updateConfig }: {YourName}ToolbarProps) {
  const [alternateView, setAlternateView] = useState(false);

  const handleToggle = () => {
    const newValue = !alternateView;
    setAlternateView(newValue);

    if (newValue) {
      updateConfig({
        columns: alternateColumns,
        groupingModel: alternateGroupingModel,
        leafField: alternateLeafField,
      });
    } else {
      updateConfig({
        columns: defaultColumns,
        groupingModel: defaultGroupingModel,
        leafField: defaultLeafField,
      });
    }
  };

  return (
    <FormControlLabel
      sx={{ display: "flex", justifyContent: "flex-end" }}
      value="Alternate View"
      control={<Switch color="primary" checked={alternateView} onChange={handleToggle} />}
      label="Alternate View"
      labelPlacement="end"
    />
  );
}
```

**Then update createFolder.ts:**

```typescript
import { {YourName}Toolbar } from "./Toolbar";

export function create{YourName}Folder(...) {
  return {
    // ...
    ToolbarExtras: {YourName}Toolbar,  // ADD THIS
  };
}
```

**REFERENCE:** See `biosamples/shared/AssayToggle.tsx` for:

- Toggle between two view modes
- Dynamic config updates with `updateConfig()`
- Different column sets and grouping models per view

---

## Validation Checklist

After implementation, verify:

- [ ] JSON data files are in `data/` directory
- [ ] All TypeScript files compile without errors
- [ ] Types match the JSON structure exactly
- [ ] Column definitions include all fields you want to display
- [ ] Grouping model creates a logical hierarchy (2-3 levels)
- [ ] Tree builder creates the same hierarchy as grouping model
- [ ] Folder is registered in `folders/index.ts`
- [ ] Folder appears in TrackSelect UI
- [ ] Items can be selected/deselected
- [ ] Selected items appear in the TreeView panel
- [ ] Remove buttons work in TreeView
- [ ] Selection persists on page refresh (sessionStorage)
- [ ] No console errors

---

## Common Patterns Reference

### Pattern: One-to-Many Data

When one track has multiple items (like biosamples has multiple assays):

```typescript
function flattenTrackIntoRows(track: TrackInfo): RowInfo[] {
  return track.items.map((item) => ({
    id: item.id,
    parentName: track.name,
    itemName: item.name,
    // ...
  }));
}
```

**REFERENCE:** `biosamples/shared/createFolder.ts` - each biosample track has multiple assays, creating one row per assay.

### Pattern: Nested Grouping

For 3-level hierarchy (Category → Subcategory → Item):

```typescript
export const defaultGroupingModel = ["category", "subcategory"];
export const defaultLeafField = "name"; // or "id"
```

**REFERENCE:** `biosamples/shared/columns.tsx` - see `sortedByAssayGroupingModel` for a 3-level example.

### Pattern: Custom Formatting

Use `valueFormatter` for simple formatting:

```typescript
{
  field: "lifeStage",
  valueFormatter: (value) => value && capitalize(value),
}
```

Use `renderCell` for complex rendering:

```typescript
{
  field: "category",
  renderCell: (params) => {
    if (params.rowNode.type === "group") {
      return <b>{params.value}</b>;
    }
    return params.value;
  },
}
```

---

## Troubleshooting

### Issue: Items not appearing in DataGrid

- Check `rowById` Map is populated correctly
- Verify `getRowId` returns unique values
- Check JSON data file path is correct

### Issue: Grouping not working

- Verify `groupingModel` fields exist in your row data
- Check field names are exact matches (case-sensitive)
- Ensure `leafField` is NOT in `groupingModel`

### Issue: Tree not building correctly

- Tree hierarchy must match `groupingModel` exactly
- Ensure `allExpAccessions` is populated at all levels
- Check node IDs are unique

### Issue: TypeScript errors

- Ensure types match JSON structure exactly
- Check import paths are correct
- Verify all required fields are present in types

---

## Reference: Biosamples Implementation

The biosamples folder is the complete reference implementation. Study these files:

**Core Files:**

- `biosamples/shared/types.ts` - Type definitions for nested data (tracks with multiple assays)
- `biosamples/shared/createFolder.ts` - Factory with one-to-many flattening
- `biosamples/shared/columns.tsx` - Two column sets for view toggling
- `biosamples/shared/treeBuilder.ts` - Two tree builders for different hierarchies

**Custom Components:**

- `biosamples/shared/constants.tsx` - Icons, colors, and formatters
- `biosamples/shared/BiosampleGroupingCell.tsx` - Custom cell with icons and expand/collapse
- `biosamples/shared/BiosampleTreeItem.tsx` - Custom tree item with icon renderer
- `biosamples/shared/AssayToggle.tsx` - View toggle toolbar component

**Assembly Files:**

- `biosamples/human.ts` - GRCh38 assembly export
- `biosamples/mouse.ts` - mm10 assembly export

**Data:**

- `biosamples/data/human.json` - Example of nested track structure
- `biosamples/data/mouse.json` - Mouse genome data

---

## Final Notes for LLMs

**When implementing:**

1. Always ask for clarification if the data structure is ambiguous
2. Show the user your understanding of the hierarchy before coding
3. Create the simplest version first (no custom components)
4. Add custom components only if needed
5. Test each step before moving to the next
6. Use the biosamples folder as a reference for patterns

**Communication:**

- Explain your decisions (especially for grouping hierarchy)
- Show example data transformations
- Summarize what you created after each major step
- Point out where you deviated from the template and why

**Key Concepts:**

- **RowInfo** = Flattened data for DataGrid (one row per selectable item)
- **TrackInfo** = Raw JSON structure (may be nested)
- **groupingModel** = Defines the hierarchy in both DataGrid and TreeView
- **leafField** = The unique identifier field (not in groupingModel)
- **rowById** = Single source of truth Map for all row data
- **buildTree** = Converts selected IDs into hierarchical tree matching groupingModel
- **allExpAccessions** = Tracks all descendant IDs for bulk operations
