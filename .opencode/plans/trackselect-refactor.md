# TrackSelect Refactoring Plan

## Overview

Refactor TrackSelect to be a **data-agnostic UI shell** that renders folder configurations passed to it. Adding a new dataset requires only creating a folder config file and adding it to the assembly's folder list.

## Goals

1. **TrackSelect is data-agnostic** - just a UI shell
2. **Adding a folder = one config file** - no core changes needed
3. **Minimal duplication** - derive what we can, share utilities
4. **Simple store** - just tracks selections by folder
5. **Assembly filters folders** - each assembly has its own list of available folders

---

## Architecture

### FolderDefinition Interface

```typescript
interface FolderDefinition<TRow = any> {
  id: string;
  label: string;

  // Data - single source of truth
  rowById: Map<string, TRow>;
  getRowId: (row: TRow) => string;

  // DataGrid config
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;

  // TreeView - how to organize selected items into a tree
  buildTree: (
    selectedIds: string[],
    rowById: Map<string, TRow>,
  ) => TreeViewBaseItem<ExtendedTreeItemProps>[];

  // Optional folder-specific toolbar UI (e.g., assay toggle for biosamples)
  ToolbarExtras?: React.FC<{
    updateConfig: (partial: Partial<FolderRuntimeConfig>) => void;
  }>;
}

interface FolderRuntimeConfig {
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
}
```

### Folder Registry

```typescript
// folders/index.ts
export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [humanBiosamplesFolder],
  mm10: [mouseBiosamplesFolder],
};
```

### TrackSelect Props

```typescript
interface TrackSelectProps {
  folders: FolderDefinition[];
  onSubmit: (selectedByFolder: Map<string, Set<string>>) => void;
  onCancel?: () => void;
  onReset?: () => void;
  maxTracks?: number;
  initialSelection?: Map<string, Set<string>>;
}
```

### Selection Store

```typescript
interface SelectionStore {
  selectedByFolder: Map<string, Set<string>>;
  activeFolderId: string;

  select: (folderId: string, ids: Set<string>) => void;
  deselect: (folderId: string, ids: Set<string>) => void;
  clear: (folderId?: string) => void;
  setActiveFolder: (folderId: string) => void;

  getAllSelectedIds: () => Set<string>;
  getSelectedForFolder: (folderId: string) => Set<string>;
  getTotalCount: () => number;
}
```

---

## Final File Structure

```
TrackSelect/
├── TrackSelect.tsx              # Data-agnostic shell
├── store.ts                     # Folder-aware selection
├── types.ts                     # Core types
│
├── DataGrid/
│   ├── DataGridWrapper.tsx      # Generic - receives folder config
│   └── GroupingCell.tsx         # Keep (generic styling)
│
├── TreeView/
│   ├── TreeViewWrapper.tsx      # Generic - receives pre-built tree
│   └── CustomTreeItem.tsx       # Extracted styling (shared)
│
└── folders/
    ├── index.ts                 # foldersByAssembly registry
    ├── types.ts                 # FolderDefinition interface
    │
    └── biosamples/
        ├── human.ts             # humanBiosamplesFolder
        ├── mouse.ts             # mouseBiosamplesFolder
        ├── shared/
        │   ├── createFolder.ts  # Factory for biosample folders
        │   ├── columns.tsx      # Biosample columns
        │   ├── treeBuilder.ts   # Biosample tree logic
        │   ├── AssayToggle.tsx  # Biosample toolbar extra
        │   └── constants.ts     # Assay types, ontology types, colors
        └── data/
            ├── human.json
            └── mouse.json
```

---

## Implementation Tasks

### Phase 1: Set Up Folder Infrastructure

#### [x] 1.1 Create folder types and base structure

**Files to create:**

- `folders/types.ts` - Define `FolderDefinition`, `FolderRuntimeConfig` interfaces
- `folders/index.ts` - Empty registry with `foldersByAssembly` placeholder

**Description:** Establish the folder abstraction layer with TypeScript interfaces that define what a folder must provide. The registry will be populated in task 1.3.

---

#### [ ] 1.2 Create biosamples shared utilities

**Files to create:**

- `folders/biosamples/shared/constants.ts` - Move `assayTypes`, `ontologyTypes`, assay color map from `consts.ts` and `treeViewHelpers.tsx`
- `folders/biosamples/shared/columns.tsx` - Move column definitions from `DataGrid/columns.tsx`
- `folders/biosamples/shared/treeBuilder.ts` - Move `buildTreeView`, `buildSortedAssayTreeView`, and supporting functions from `treeViewHelpers.tsx`

**Description:** Extract all biosample-specific logic into the biosamples folder, keeping it self-contained. This includes constants, column definitions, and tree building logic.

---

#### [ ] 1.3 Create biosample folder configs and move data

**Files to create/move:**

- Move `Data/humanBiosamples.json` -> `folders/biosamples/data/human.json`
- Move `Data/mouseBiosamples.json` -> `folders/biosamples/data/mouse.json`
- `folders/biosamples/shared/createFolder.ts` - Factory function that builds a `FolderDefinition` from biosample data
- `folders/biosamples/human.ts` - Export `humanBiosamplesFolder` using factory
- `folders/biosamples/mouse.ts` - Export `mouseBiosamplesFolder` using factory
- Update `folders/index.ts` - Register biosample folders in `foldersByAssembly`

**Description:** Create the biosample folder implementations using a shared factory to reduce duplication between human and mouse. The factory handles data transformation, column setup, and tree building.

---

### Phase 2: Create AssayToggle Component

#### [ ] 2.1 Extract AssayToggle as a ToolbarExtras component

**Files to create:**

- `folders/biosamples/shared/AssayToggle.tsx` - Standalone component that receives `updateConfig` callback

**Files to update:**

- `folders/biosamples/shared/createFolder.ts` - Wire up `ToolbarExtras: AssayToggle`

**Description:** The assay toggle is biosample-specific. Extract it as a `ToolbarExtras` component that can update the folder's runtime config (columns, groupingModel, leafField) when toggled.

---

### Phase 3: Refactor Store

#### [ ] 3.1 Rewrite store to be folder-aware

**Files to rewrite:**

- `store.ts` - New interface with `selectedByFolder`, `activeFolderId`, folder-aware actions and getters

**Files to update:**

- `types.ts` - Add/update store-related types

**Description:** The store no longer knows about biosamples, rows, or assemblies. It only tracks which IDs are selected per folder. The store is created with a list of folder IDs and manages selections independently.

---

### Phase 4: Refactor UI Components

#### [ ] 4.1 Extract CustomTreeItem styling

**Files to create:**

- `TreeView/CustomTreeItem.tsx` - Move `CustomTreeItem`, `CustomLabel`, styled components from `treeViewHelpers.tsx`

**Files to update:**

- `folders/biosamples/shared/constants.ts` - Move `AssayIcon` here (biosample-specific)
- `TreeView/treeViewHelpers.tsx` - Will be deleted in Phase 5, but for now remove moved code

**Description:** Separate reusable tree item styling from biosample-specific tree building logic. The `CustomTreeItem` component is generic and can be used by any folder's tree.

---

#### [ ] 4.2 Update TreeViewWrapper to be generic

**Files to update:**

- `TreeView/TreeViewWrapper.tsx` - Accept pre-built tree items array (one per folder with selections), generic `onRemove` callback, remove store dependency
- `types.ts` - Update `TreeViewWrapperProps`

**New props interface:**

```typescript
interface TreeViewWrapperProps {
  items: TreeViewBaseItem<ExtendedTreeItemProps>[];
  selectedCount: number;
  onRemove: (item: TreeViewBaseItem<ExtendedTreeItemProps>) => void;
}
```

**Description:** TreeViewWrapper should just render whatever tree items it receives. It doesn't need to know about biosamples, stores, or how to derive IDs to remove. The parent (TrackSelect) handles that logic.

---

#### [ ] 4.3 Update DataGridWrapper to be generic

**Files to update:**

- `DataGrid/DataGridWrapper.tsx` - Accept `columns`, `groupingModel`, `leafField`, `rows` as direct props
- `types.ts` - Update `DataGridProps`

**New props interface:**

```typescript
interface DataGridWrapperProps {
  rows: any[];
  columns: GridColDef[];
  groupingModel: string[];
  leafField: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  label?: string;
}
```

**Description:** DataGridWrapper receives all configuration from props. It doesn't import any biosample-specific code or manage sort modes internally.

---

#### [ ] 4.4 Rewrite TrackSelect as data-agnostic shell

**Files to rewrite:**

- `TrackSelect.tsx` - Complete rewrite

**New responsibilities:**

- Accept `folders: FolderDefinition[]` prop
- Manage folder tabs/selector UI (if multiple folders)
- Track active folder and its runtime config (for ToolbarExtras updates)
- Render active folder's `ToolbarExtras` component if present
- Derive rows from `folder.rowById` for DataGrid
- Build combined tree from all folders with selections
- Handle selection changes and enforce `maxTracks` limit
- Manage working state vs committed state pattern
- Remove all biosample-specific imports and logic
- Comment out or remove search functionality (to be revisited later)

**Description:** TrackSelect becomes a pure UI shell that orchestrates folders, DataGrid, and TreeView without knowing anything about the data structure inside each folder.

---

### Phase 5: Cleanup

#### [ ] 5.1 Delete obsolete files

**Files to delete:**

- `consts.ts` - Contents moved to folder configs and constants
- `DataGrid/columns.tsx` - Moved to `folders/biosamples/shared/columns.tsx`
- `DataGrid/dataGridHelpers.tsx` - Logic moved to biosamples folder
- `TreeView/treeViewHelpers.tsx` - Styling moved to `CustomTreeItem.tsx`, logic moved to biosamples
- `Data/` directory - Data files moved to `folders/biosamples/data/`
- `DataGrid/CustomToolbar.tsx` - Unused

**Description:** Remove files that are no longer needed after the refactor.

---

#### [ ] 5.2 Clean up types.ts

**Files to update:**

- `types.ts` - Remove biosample-specific types, keep only shared UI types

**Types to remove:**

- `TrackInfo`, `AssayInfo` - Move to biosamples folder
- `SearchTracksProps` - Deferred (search disabled)
- Biosample-specific row types

**Types to keep:**

- `ExtendedTreeItemProps` - Used by tree rendering
- `CustomTreeItemProps`, `CustomLabelProps` - Used by CustomTreeItem
- Store types (updated in 3.1)
- Component prop types (updated in 4.2, 4.3)

**Description:** Clean up the types file to only contain types that are truly shared across all folders.

---

### Phase 6: Update Consumers

#### [ ] 6.1 Update test/main.tsx and document changes for production

**Files to update:**

- `packages/ui/test/main.tsx` - Update to use new TrackSelect API

**Changes required:**

1. Import `foldersByAssembly` from `folders/index.ts` instead of `createSelectionStore`
2. Replace `createSelectionStore(assembly, ids)` with `createSelectionStore(folderIds)`
3. Pass `folders={foldersByAssembly[currentAssembly]}` to TrackSelect
4. Update `handleSubmit` to receive `Map<string, Set<string>>` instead of `Set<string>`
5. Update `rowById` lookup to use folder's `rowById` (from the folder definition)
6. Update localStorage keys/structure if needed for multi-folder selection

**Before (current implementation):**

```typescript
import { createSelectionStore, TrackSelect, RowInfo } from "../src/lib";

const selectionStore = useMemo(() => {
  const localIds = getLocalStorage(currentAssembly);
  const ids = localIds != null ? localIds : new Set<string>();
  return createSelectionStore(currentAssembly, ids);
}, [currentAssembly]);

const rowById = selectionStore((s) => s.rowById);

const handleSubmit = useCallback((newTrackIds: Set<string>) => {
  // ... uses rowById.get(id) to get track info
}, []);

<TrackSelect
  store={selectionStore}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onReset={handleReset}
/>;
```

**After (new implementation):**

```typescript
import {
  foldersByAssembly,
  createSelectionStore,
  TrackSelect,
} from "../src/lib";

const folders = foldersByAssembly[currentAssembly];

const selectionStore = useMemo(() => {
  const folderIds = folders.map((f) => f.id);
  const initialSelection = getLocalStorage(currentAssembly); // returns Map<string, Set<string>> or null
  return createSelectionStore(folderIds, initialSelection);
}, [folders, currentAssembly]);

const handleSubmit = useCallback(
  (selectedByFolder: Map<string, Set<string>>) => {
    // Iterate through each folder's selections
    for (const folder of folders) {
      const selectedIds = selectedByFolder.get(folder.id) || new Set();
      // Use folder.rowById.get(id) to get track info
      for (const id of selectedIds) {
        const row = folder.rowById.get(id);
        // ... generate track from row
      }
    }
    setLocalStorage(selectedByFolder, currentAssembly);
    setOpen(false);
  },
  [folders]
);

<TrackSelect
  folders={folders}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onReset={handleReset}
  maxTracks={30}
/>;
```

---

## Production Migration Summary

When migrating production code, make these changes:

| Change               | Before                                       | After                                                  |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Imports**          | `createSelectionStore, TrackSelect, RowInfo` | `foldersByAssembly, createSelectionStore, TrackSelect` |
| **Get folders**      | N/A (hardcoded biosamples)                   | `const folders = foldersByAssembly[assembly]`          |
| **Create store**     | `createSelectionStore(assembly, initialIds)` | `createSelectionStore(folderIds, initialSelection)`    |
| **TrackSelect prop** | `store={selectionStore}`                     | `folders={folders}`                                    |
| **onSubmit param**   | `(trackIds: Set<string>)`                    | `(selectedByFolder: Map<string, Set<string>>)`         |
| **Row lookup**       | `store.rowById.get(id)`                      | `folder.rowById.get(id)`                               |
| **localStorage**     | `Set<string>` serialized                     | `Map<string, Set<string>>` serialized                  |

---

## Task Summary

| Task | Description                                      | Estimated Scope     |
| ---- | ------------------------------------------------ | ------------------- |
| 1.1  | Create folder types and base structure           | ~60 lines, 2 files  |
| 1.2  | Create biosamples shared utilities               | ~350 lines, 3 files |
| 1.3  | Create biosample folder configs and move data    | ~150 lines, 5 files |
| 2.1  | Extract AssayToggle component                    | ~80 lines, 2 files  |
| 3.1  | Rewrite store to be folder-aware                 | ~80 lines, 2 files  |
| 4.1  | Extract CustomTreeItem styling                   | ~200 lines, 2 files |
| 4.2  | Update TreeViewWrapper to be generic             | ~60 lines, 2 files  |
| 4.3  | Update DataGridWrapper to be generic             | ~50 lines, 2 files  |
| 4.4  | Rewrite TrackSelect as data-agnostic shell       | ~250 lines, 1 file  |
| 5.1  | Delete obsolete files                            | 6 files deleted     |
| 5.2  | Clean up types.ts                                | ~40 lines, 1 file   |
| 6.1  | Update test/main.tsx and document for production | ~80 lines, 1 file   |

---

## Adding a New Folder (Future Reference)

To add a new dataset (e.g., gene tracks):

### 1. Create the folder config

```typescript
// folders/genes/human.ts
import { FolderDefinition } from "../types";
import genesData from "./data/human.json";

// Transform data into rowById map
const rowById = new Map(
  genesData.genes.map((g) => [
    g.id,
    {
      id: g.id,
      symbol: g.symbol,
      name: g.name,
      chromosome: g.chromosome,
      url: g.url,
    },
  ]),
);

export const humanGenesFolder: FolderDefinition = {
  id: "human-genes",
  label: "Genes",
  rowById,
  getRowId: (row) => row.id,

  columns: [
    { field: "symbol", headerName: "Symbol", width: 120 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "chromosome", headerName: "Chr", width: 80 },
  ],
  groupingModel: ["chromosome"],
  leafField: "symbol",

  buildTree: (selectedIds, rowById) => {
    // Group by chromosome
    const byChromosome = new Map<string, any[]>();
    for (const id of selectedIds) {
      const row = rowById.get(id);
      if (!row) continue;
      const list = byChromosome.get(row.chromosome) || [];
      list.push(row);
      byChromosome.set(row.chromosome, list);
    }

    return [
      {
        id: "genes-root",
        label: "Genes",
        icon: "folder",
        children: Array.from(byChromosome.entries()).map(([chr, genes]) => ({
          id: `chr-${chr}`,
          label: `Chromosome ${chr}`,
          icon: "folder",
          allExpAccessions: genes.map((g) => g.id),
          children: genes.map((g) => ({
            id: g.id,
            label: g.symbol,
            icon: "removeable",
            allExpAccessions: [g.id],
          })),
        })),
      },
    ];
  },
};
```

### 2. Add to registry

```typescript
// folders/index.ts
import { humanBiosamplesFolder } from "./biosamples/human";
import { mouseBiosamplesFolder } from "./biosamples/mouse";
import { humanGenesFolder } from "./genes/human";

export const foldersByAssembly: Record<Assembly, FolderDefinition[]> = {
  GRCh38: [humanBiosamplesFolder, humanGenesFolder],
  mm10: [mouseBiosamplesFolder],
};
```

**No changes to TrackSelect or any core components required.**
