# TrackSelect Generic Architecture Refactoring Plan

## Overview
Transform TrackSelect from a biosample-specific component into a **generic, data-agnostic component** that can work with any type of hierarchical data. The component will accept configuration for grouping, columns, and search, making it reusable across different data types.

## Current State - Biosample Coupling
The component is tightly coupled to biosample data in multiple ways:

### Data Structure Coupling
- **RowInfo type**: Hardcoded fields (`ontology`, `assay`, `lifeStage`, `sampleType`, `displayname`, etc.)
- **TrackInfo type**: Biosample-specific nested structure with `assays` array
- **Assembly-specific**: Loads data based on assembly ("GRCh38" or "mm10")
- **buildRowsForAssembly()**: Completely biosample-specific row builder

### UI Coupling
- **Hardcoded labels**: "Biosamples" (6 occurrences), "Sort by assay"
- **Hardcoded columns**: All column definitions are biosample-specific
- **Hardcoded valueOptions**: `assayTypes` (8 types), `ontologyTypes` (37 types), `sampleType` values, `lifeStage` values
- **Hardcoded search keys**: 7 biosample-specific fields repeated in 2 places

### Logic Coupling
- **Tree building**: `buildTreeView()` and `buildSortedAssayTreeView()` hardcode grouping hierarchy (ontology → displayname → assay OR assay → ontology → displayname)
- **Assay formatting**: `formatAssayName()` has switch statement for 8 assay types
- **Icons**: `AssayIcon()` has hardcoded color map for each assay type
- **Store initialization**: Requires assembly parameter, builds biosample-specific rows

### Files with Biosample Coupling
1. `TrackSelect.tsx` - Assembly logic, hardcoded labels, biosample-specific tree builders
2. `types.ts` - RowInfo, TrackInfo, AssayInfo are all biosample-specific
3. `consts.ts` - assayTypes, ontologyTypes, buildRowsForAssembly
4. `store.ts` - Takes assembly, calls buildRowsForAssembly
5. `DataGrid/columns.tsx` - All columns biosample-specific
6. `DataGrid/dataGridHelpers.tsx` - formatAssayType, getTracksByAssayAndOntology
7. `TreeView/treeViewHelpers.tsx` - formatAssayName, AssayIcon, biosample-specific tree builders

---

## Target Architecture - Generic TrackSelect

### Design Principles
1. **Data-Agnostic**: Component works with any row type, not just RowInfo
2. **Configuration-Driven**: All behavior controlled via props (grouping, columns, search)
3. **Type-Safe**: Use TypeScript generics for row type
4. **Flexible**: Support multiple grouping modes and custom renderers
5. **Example-Based**: Biosample usage becomes a configuration example, not built-in

### New Component API

```typescript
interface TrackSelectConfig<TRow extends Record<string, any>> {
  // Data
  rows: TRow[];
  rowById: Map<string, TRow>;

  // Column Configuration
  columns: ColumnConfig<TRow>[];

  // Grouping Configuration
  groupingModes: GroupingMode<TRow>[];
  defaultGroupingMode?: string;

  // Search Configuration
  searchConfig: SearchConfig<TRow>;

  // Selection Configuration
  maxSelection?: number;
  initialSelectedIds?: Set<string>;

  // Labels
  rootLabel: string; // e.g., "Biosamples", "Genes", "Samples"

  // Callbacks
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onSubmit?: (selectedIds: Set<string>) => void;
  onCancel?: () => void;
  onReset?: () => void;
}

// Grouping mode defines how to organize the tree
interface GroupingMode<TRow> {
  id: string;
  label: string; // e.g., "Sort by assay", "Sort by chromosome"
  groupByFields: string[]; // e.g., ['assay', 'ontology', 'displayname']
}

// Column configuration
interface ColumnConfig<TRow> {
  field: keyof TRow | string;
  headerName: string;
  type?: 'string' | 'number' | 'singleSelect' | 'custom';
  valueOptions?: string[];
  renderCell?: (params: RenderCellParams<TRow>) => ReactNode;
  renderGroupCell?: (params: RenderCellParams<TRow>) => ReactNode;
  valueFormatter?: (value: any) => string;
  groupable?: boolean; // Can this field be used for grouping?
}

// Search configuration
interface SearchConfig<TRow> {
  searchableFields: (keyof TRow)[];
  fieldWeights?: Record<keyof TRow, number>;
  threshold?: number;
  debounceMs?: number;
}
```

### Example Usage - Biosample Tracks

```typescript
// biosampleTrackSelectConfig.ts
import { createBiosampleColumns, createBiosampleGroupingModes } from './biosampleConfig';

const biosampleConfig: TrackSelectConfig<BiosampleRowInfo> = {
  rows: biosampleRows,
  rowById: biosampleRowById,

  columns: createBiosampleColumns(), // See below

  groupingModes: [
    {
      id: 'default',
      label: 'Default',
      groupByFields: ['ontology', 'displayname', 'assay'],
    },
    {
      id: 'by-assay',
      label: 'Sort by assay',
      groupByFields: ['assay', 'ontology', 'displayname'],
    },
  ],
  defaultGroupingMode: 'default',

  searchConfig: {
    searchableFields: ['displayname', 'ontology', 'lifeStage', 'sampleType', 'assay'],
    threshold: 0.75,
    debounceMs: 300,
  },

  maxSelection: 30,
  rootLabel: 'Biosamples',

  onSubmit: (ids) => { /* ... */ },
  onCancel: () => { /* ... */ },
  onReset: () => { /* ... */ },
};

// Usage
<TrackSelect config={biosampleConfig} />
```

### Key Changes from Current Architecture

| Aspect | Current (Biosample-Specific) | New (Generic) |
|--------|------------------------------|---------------|
| **Data Type** | Hardcoded `RowInfo` | Generic `TRow extends Record<string, any>` |
| **Columns** | Hardcoded in `columns.tsx` | Configurable via `columns` prop |
| **Grouping** | 2 hardcoded tree builders | Generic tree builder + `groupingModes` config |
| **Search Keys** | Hardcoded 7 fields | Configurable via `searchConfig.searchableFields` |
| **Labels** | Hardcoded "Biosamples" | Configurable via `rootLabel` prop |
| **Icons/Colors** | Hardcoded assay colors | Configurable via column `renderCell` |
| **Store Init** | Assembly-based, calls `buildRowsForAssembly` | Accepts pre-built `rows` and `rowById` |
| **Value Options** | Hardcoded `assayTypes`, `ontologyTypes` | Configurable per column via `valueOptions` |

---

## Implementation Plan

### Phase 1: Create Generic Core Types & Utilities

**Goal**: Define the generic architecture without breaking existing code

#### 1.1 Create New Generic Types
**File**: `TrackSelect/generic/types.ts` (new file)

```typescript
export interface TrackSelectConfig<TRow extends Record<string, any>> {
  rows: TRow[];
  rowById: Map<string, TRow>;
  columns: ColumnConfig<TRow>[];
  groupingModes: GroupingMode<TRow>[];
  defaultGroupingMode?: string;
  searchConfig: SearchConfig<TRow>;
  maxSelection?: number;
  initialSelectedIds?: Set<string>;
  rootLabel: string;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onSubmit?: (selectedIds: Set<string>) => void;
  onCancel?: () => void;
  onReset?: () => void;
}

export interface GroupingMode<TRow> {
  id: string;
  label: string;
  groupByFields: (keyof TRow)[];
  // Optional custom node renderer for this grouping level
  renderGroupNode?: (field: keyof TRow, value: any) => ReactNode;
}

export interface ColumnConfig<TRow> {
  field: keyof TRow | string;
  headerName: string;
  type?: 'string' | 'number' | 'singleSelect' | 'custom';
  valueOptions?: string[];
  renderCell?: (params: any) => ReactNode;
  renderGroupCell?: (params: any) => ReactNode;
  valueFormatter?: (value: any) => string;
  groupable?: boolean;
  width?: number;
  maxWidth?: number;
  hide?: boolean;
}

export interface SearchConfig<TRow> {
  searchableFields: (keyof TRow)[];
  fieldWeights?: Partial<Record<keyof TRow, number>>;
  threshold?: number;
  debounceMs?: number;
}

// Generic tree node props
export interface GenericTreeItemProps {
  id: string;
  label: string;
  icon?: ReactNode;
  customRenderer?: ReactNode;
  allRecordIds?: string[]; // IDs of all leaf records under this node
  metadata?: Record<string, any>; // Generic metadata storage
}
```

#### 1.2 Create Generic Tree Builder
**File**: `TrackSelect/generic/treeBuilder.ts` (new file)

```typescript
import { TreeViewBaseItem } from "@mui/x-tree-view";
import { GenericTreeItemProps } from "./types";

/**
 * Generic tree builder that works with any row type and grouping configuration
 */
export function buildGenericTree<TRow extends Record<string, any>>(
  selectedIds: string[],
  rowById: Map<string, TRow>,
  groupByFields: (keyof TRow)[],
  rootLabel: string,
  options?: {
    getRowId?: (row: TRow) => string;
    renderGroupNode?: (field: keyof TRow, value: any, depth: number) => ReactNode;
  }
): TreeViewBaseItem<GenericTreeItemProps>[] {
  const { getRowId = (row) => (row as any).id } = options || {};

  // Root node
  const root: TreeViewBaseItem<GenericTreeItemProps> = {
    id: "root",
    label: rootLabel,
    icon: undefined,
    children: [],
    allRecordIds: [],
  };

  // Get selected rows
  const selectedRows = selectedIds.reduce<TRow[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  if (groupByFields.length === 0) {
    // No grouping - flat list
    root.children = selectedRows.map(row => ({
      id: getRowId(row),
      label: String(row.displayname || row.name || getRowId(row)),
      allRecordIds: [getRowId(row)],
    }));
    return [root];
  }

  // Build hierarchical tree based on groupByFields
  const nodeMap = new Map<string, TreeViewBaseItem<GenericTreeItemProps>>();
  let nodeIdCounter = 1;

  selectedRows.forEach((row) => {
    let currentParent: TreeViewBaseItem<GenericTreeItemProps> = root;
    let pathParts: string[] = [];

    // Build path through grouping hierarchy
    groupByFields.forEach((field, depth) => {
      const value = row[field];
      if (value === undefined || value === null) return;

      pathParts.push(`${String(field)}/${String(value)}`);
      const nodePath = pathParts.join('|');

      let node = nodeMap.get(nodePath);
      if (!node) {
        const nodeId = `auto-generated-${nodeIdCounter++}`;
        node = {
          id: nodeId,
          label: String(value),
          icon: options?.renderGroupNode?.(field, value, depth),
          children: [],
          allRecordIds: [],
          metadata: { field, value, depth, isGroup: true },
        };
        nodeMap.set(nodePath, node);
        currentParent.children = currentParent.children || [];
        currentParent.children.push(node);
      }
      currentParent = node;
    });

    // Add leaf node (the actual record)
    const leafId = getRowId(row);
    const leafNode: TreeViewBaseItem<GenericTreeItemProps> = {
      id: leafId,
      label: String(row.displayname || row.name || leafId),
      allRecordIds: [leafId],
      metadata: { isLeaf: true, row },
    };
    currentParent.children = currentParent.children || [];
    currentParent.children.push(leafNode);

    // Propagate leaf IDs up to all ancestors
    root.allRecordIds?.push(leafId);
    pathParts.forEach((_, i) => {
      const ancestorPath = pathParts.slice(0, i + 1).join('|');
      const ancestor = nodeMap.get(ancestorPath);
      if (ancestor?.allRecordIds) {
        ancestor.allRecordIds.push(leafId);
      }
    });
  });

  return [root];
}

/**
 * Generic search across tree items
 */
export function searchGenericTree<TRow>(
  items: TreeViewBaseItem<GenericTreeItemProps>[],
  query: string,
  searchableFields: (keyof TRow)[],
  threshold: number = 0.75
): TreeViewBaseItem<GenericTreeItemProps>[] {
  // Implementation using Fuse.js on metadata.row
  // ... (similar to current searchTreeItems but generic)
  return items; // Placeholder
}
```

#### 1.3 Create Generic Store Factory
**File**: `TrackSelect/generic/store.ts` (new file)

```typescript
import { create, StoreApi, UseBoundStore } from "zustand";

export interface GenericSelectionState<TRow> {
  maxSelection: number;
  rows: TRow[];
  rowById: Map<string, TRow>;
  selectedIds: Set<string>;
}

export interface GenericSelectionActions<TRow> {
  getSelectedRows: () => TRow[];
  setSelected: (ids: Set<string>) => void;
  removeIds: (ids: Set<string>) => void;
  clear: () => void;
}

export type GenericStoreInstance<TRow> = UseBoundStore<
  StoreApi<GenericSelectionState<TRow> & GenericSelectionActions<TRow>>
>;

export function createGenericSelectionStore<TRow extends Record<string, any>>(
  rows: TRow[],
  rowById: Map<string, TRow>,
  maxSelection: number = 30,
  initialIds?: Set<string>,
  getRowId: (row: TRow) => string = (row) => (row as any).id
): GenericStoreInstance<TRow> {
  return create<GenericSelectionState<TRow> & GenericSelectionActions<TRow>>((set, get) => ({
    maxSelection,
    rows,
    rowById,
    selectedIds: initialIds ? new Set(initialIds) : new Set<string>(),

    getSelectedRows: () => {
      const all = get().selectedIds;
      const storeRowById = get().rowById;
      return Array.from(all)
        .map(id => storeRowById.get(id))
        .filter((row): row is TRow => row !== undefined);
    },

    setSelected: (ids: Set<string>) => set({ selectedIds: new Set(ids) }),

    removeIds: (removedIds: Set<string>) => set((state) => {
      const next = new Set(state.selectedIds);
      removedIds.forEach(id => next.delete(id));
      return { selectedIds: next };
    }),

    clear: () => set({ selectedIds: new Set<string>() }),
  }));
}
```

---

### Phase 2: Create Biosample Configuration Module

**Goal**: Extract all biosample-specific logic into a reusable configuration module

#### 2.1 Create Biosample Types
**File**: `TrackSelect/examples/biosample/types.ts` (new file)

```typescript
// Move biosample-specific types here
export type BiosampleAssayInfo = {
  id: string;
  assay: string;
  url: string;
  experimentAccession: string;
  fileAccession: string;
};

export type BiosampleTrackInfo = {
  name: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assays: BiosampleAssayInfo[];
};

export type BiosampleRowInfo = {
  id: string;
  ontology: string;
  lifeStage: string;
  sampleType: string;
  displayname: string;
  assay: string;
  experimentAccession: string;
  fileAccession: string;
  url: string;
};

export type BiosampleAssembly = "GRCh38" | "mm10";
```

#### 2.2 Create Biosample Constants
**File**: `TrackSelect/examples/biosample/constants.ts` (new file)

```typescript
export const ASSAY_TYPES = [
  "cCRE", "DNase", "H3K4me3", "H3K27ac",
  "ATAC", "CTCF", "RNA-seq", "ChromHMM",
] as const;

export const ONTOLOGY_TYPES = [
  "Adipose", "Adrenal gland", "Blood", "Blood vessel",
  // ... all 37 types
] as const;

export const ASSAY_DISPLAY_MAP: Record<string, string> = {
  dnase: "DNase",
  atac: "ATAC",
  h3k4me3: "H3K4me3",
  h3k27ac: "H3K27ac",
  ctcf: "CTCF",
  chromhmm: "ChromHMM",
  ccre: "cCRE",
  rnaseq: "RNA-seq",
};

export const ASSAY_COLORS: Record<string, string> = {
  DNase: "#06da93",
  ATAC: "#02c7b9",
  H3K4me3: "#ff2020",
  ChromHMM: "#0097a7",
  H3K27ac: "#fdc401",
  CTCF: "#01a6f1",
  cCRE: "#000000",
  "RNA-seq": "#00aa00",
};

export const SAMPLE_TYPE_OPTIONS = [
  "tissue",
  "primary cell",
  "cell line",
  "in vitro differentiated cells",
  "organoid",
];

export const LIFE_STAGE_OPTIONS = ["adult", "embryonic"];
```

#### 2.3 Create Biosample Column Builder
**File**: `TrackSelect/examples/biosample/columns.tsx` (new file)

```typescript
import { ColumnConfig } from '../../generic/types';
import { BiosampleRowInfo } from './types';
import { ASSAY_TYPES, ONTOLOGY_TYPES, SAMPLE_TYPE_OPTIONS, LIFE_STAGE_OPTIONS, ASSAY_COLORS } from './constants';
import { capitalize, Stack, Box } from '@mui/material';

// Assay icon component
function AssayIcon({ assay }: { assay: string }) {
  const color = ASSAY_COLORS[assay];
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

export function createBiosampleColumns(
  groupingMode: 'default' | 'by-assay'
): ColumnConfig<BiosampleRowInfo>[] {
  // Shared columns
  const displayNameCol: ColumnConfig<BiosampleRowInfo> = {
    field: "displayname",
    headerName: "Name",
    valueFormatter: (value) => value && capitalize(value),
    maxWidth: 300,
  };

  const sampleTypeCol: ColumnConfig<BiosampleRowInfo> = {
    field: "sampleType",
    headerName: "Sample Type",
    type: "singleSelect",
    valueOptions: SAMPLE_TYPE_OPTIONS,
    valueFormatter: (value) => value && capitalize(value),
  };

  const lifeStageCol: ColumnConfig<BiosampleRowInfo> = {
    field: "lifeStage",
    headerName: "Life Stage",
    type: "singleSelect",
    valueOptions: LIFE_STAGE_OPTIONS,
    valueFormatter: (value) => value && capitalize(value),
  };

  // Grouping-specific columns
  if (groupingMode === 'by-assay') {
    return [
      displayNameCol,
      {
        field: "ontology",
        headerName: "Ontology",
        type: "singleSelect",
        valueOptions: ONTOLOGY_TYPES,
        renderGroupCell: (params) => {
          if (params.rowNode.type === "group" && params.value) {
            return <div><b>{params.value}</b></div>;
          }
          return null;
        },
      },
      sampleTypeCol,
      lifeStageCol,
      {
        field: "assay",
        headerName: "Assay",
        valueOptions: ASSAY_TYPES,
        renderGroupCell: (params) => {
          if (params.rowNode.type === "group" && params.value) {
            return (
              <Stack direction="row" spacing={2} alignItems="center">
                <AssayIcon assay={params.value} />
                <div><b>{params.value}</b></div>
              </Stack>
            );
          }
          return null;
        },
      },
      { field: "experimentAccession", headerName: "Experiment Accession" },
      { field: "fileAccession", headerName: "File Accession" },
      { field: "id", headerName: "ID", hide: true },
    ];
  } else {
    // Default mode
    return [
      {
        field: "assay",
        headerName: "Assay",
        valueOptions: ASSAY_TYPES,
        renderCell: (params) => {
          if (params.value) {
            return (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: 6 }}>
                <AssayIcon assay={params.value} />
                <div>{params.value}</div>
              </Stack>
            );
          }
          return null;
        },
      },
      sampleTypeCol,
      lifeStageCol,
      {
        field: "ontology",
        headerName: "Ontology",
        type: "singleSelect",
        valueOptions: ONTOLOGY_TYPES,
        renderGroupCell: (params) => {
          if (params.rowNode.type === "group" && params.value) {
            return <div><b>{params.value}</b></div>;
          }
          return null;
        },
      },
      displayNameCol,
      { field: "experimentAccession", headerName: "Experiment Accession" },
      { field: "fileAccession", headerName: "File Accession" },
      { field: "id", headerName: "ID", hide: true },
    ];
  }
}
```

#### 2.4 Create Biosample Data Loader
**File**: `TrackSelect/examples/biosample/dataLoader.ts` (new file)

```typescript
import { BiosampleAssembly, BiosampleRowInfo, BiosampleTrackInfo } from './types';
import { ASSAY_TYPES, ONTOLOGY_TYPES } from './constants';
import humanData from '../../Data/humanBiosamples.json';
import mouseData from '../../Data/mouseBiosamples.json';

export function getBiosampleData(assembly: BiosampleAssembly): any {
  return assembly === "GRCh38" ? humanData : mouseData;
}

export function flattenBiosampleTrack(track: BiosampleTrackInfo): BiosampleRowInfo[] {
  return track.assays.map(assay => ({
    id: assay.id,
    ontology: track.ontology,
    lifeStage: track.lifeStage,
    sampleType: track.sampleType,
    displayname: track.displayname,
    assay: assay.assay,
    experimentAccession: assay.experimentAccession,
    fileAccession: assay.fileAccession,
    url: assay.url,
  }));
}

export function buildBiosampleRows(assembly: BiosampleAssembly): {
  rows: BiosampleRowInfo[];
  rowById: Map<string, BiosampleRowInfo>;
} {
  const data = getBiosampleData(assembly);
  const rows = ONTOLOGY_TYPES.flatMap((ontology) =>
    ASSAY_TYPES.flatMap((assay) => {
      // Filter tracks by ontology and assay
      const filteredTracks = data.tracks.filter((t: BiosampleTrackInfo) =>
        t.ontology.toLowerCase() === ontology.toLowerCase() &&
        t.assays.some(a => a.assay.toLowerCase() === assay.toLowerCase())
      );
      return filteredTracks.flatMap((t: BiosampleTrackInfo) =>
        flattenBiosampleTrack(t).map(flat => ({
          ...flat,
          assay,
          ontology,
        }))
      );
    })
  );
  const rowById = new Map<string, BiosampleRowInfo>(rows.map(r => [r.id, r]));
  return { rows, rowById };
}
```

#### 2.5 Create Biosample Config Factory
**File**: `TrackSelect/examples/biosample/config.ts` (new file)

```typescript
import { TrackSelectConfig, GroupingMode } from '../../generic/types';
import { BiosampleRowInfo, BiosampleAssembly } from './types';
import { buildBiosampleRows } from './dataLoader';
import { createBiosampleColumns } from './columns';

export function createBiosampleConfig(
  assembly: BiosampleAssembly,
  callbacks?: {
    onSubmit?: (ids: Set<string>) => void;
    onCancel?: () => void;
    onReset?: () => void;
  }
): TrackSelectConfig<BiosampleRowInfo> {
  const { rows, rowById } = buildBiosampleRows(assembly);

  const groupingModes: GroupingMode<BiosampleRowInfo>[] = [
    {
      id: 'default',
      label: 'Default',
      groupByFields: ['ontology', 'displayname', 'assay'],
    },
    {
      id: 'by-assay',
      label: 'Sort by assay',
      groupByFields: ['assay', 'ontology', 'displayname'],
    },
  ];

  return {
    rows,
    rowById,
    columns: createBiosampleColumns('default'), // Will be updated based on mode
    groupingModes,
    defaultGroupingMode: 'default',
    searchConfig: {
      searchableFields: ['displayname', 'ontology', 'lifeStage', 'sampleType', 'assay', 'experimentAccession', 'fileAccession'],
      threshold: 0.75,
      debounceMs: 300,
    },
    maxSelection: 30,
    rootLabel: 'Biosamples',
    ...callbacks,
  };
}
```

---

### Phase 3: Refactor Core TrackSelect Component

**Goal**: Transform TrackSelect.tsx to use generic configuration

#### 3.1 Create Generic TrackSelect Component
**File**: `TrackSelect/TrackSelect.tsx` (refactor existing)

Key changes:
1. Replace `store` prop with `config: TrackSelectConfig<TRow>` prop
2. Make component generic: `function TrackSelect<TRow extends Record<string, any>>({ config }: { config: TrackSelectConfig<TRow> })`
3. Use `config.groupingModes` instead of hardcoded sortedAssay toggle
4. Use `buildGenericTree()` instead of biosample-specific tree builders
5. Use `config.columns` instead of hardcoded column definitions
6. Use `config.searchConfig` instead of hardcoded search keys
7. Use `config.rootLabel` instead of hardcoded "Biosamples"
8. Create internal store from config using `createGenericSelectionStore()`

Pseudocode:
```typescript
export function TrackSelect<TRow extends Record<string, any>>({
  config
}: {
  config: TrackSelectConfig<TRow>
}) {
  // Create internal store from config
  const store = useMemo(() =>
    createGenericSelectionStore(
      config.rows,
      config.rowById,
      config.maxSelection,
      config.initialSelectedIds
    ),
    [config.rows, config.rowById, config.maxSelection, config.initialSelectedIds]
  );

  const [currentGroupingMode, setCurrentGroupingMode] = useState(
    config.defaultGroupingMode || config.groupingModes[0]?.id
  );

  const activeGrouping = config.groupingModes.find(m => m.id === currentGroupingMode);

  // Build tree using generic tree builder
  const treeItems = useMemo(() => {
    return buildGenericTree(
      Array.from(workingTrackIds),
      config.rowById,
      activeGrouping?.groupByFields || [],
      config.rootLabel
    );
  }, [workingTrackIds, activeGrouping, config.rowById, config.rootLabel]);

  // ... rest of component using config values
}
```

#### 3.2 Update DataGridWrapper
**File**: `TrackSelect/DataGrid/DataGridWrapper.tsx`

Changes:
1. Accept `columns: ColumnConfig<TRow>[]` prop instead of hardcoded columns
2. Convert `ColumnConfig` to MUI `GridColDef` format
3. Remove `sortedAssay` prop, use `groupByFields` prop instead
4. Make generic with `<TRow>`

#### 3.3 Update TreeViewWrapper
**File**: `TrackSelect/TreeView/TreeViewWrapper.tsx`

Changes:
1. Make generic with `<TRow>`
2. Use `GenericTreeItemProps` instead of `ExtendedTreeItemProps`
3. Remove biosample-specific assumptions

---

### Phase 4: Update Existing Usage

**Goal**: Update existing TrackSelect usage to use biosample config

#### 4.1 Update Parent Component
Wherever TrackSelect is currently used:

**Before**:
```typescript
const store = createSelectionStore(assembly, initialIds);
<TrackSelect
  store={store}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onReset={handleReset}
/>
```

**After**:
```typescript
const biosampleConfig = createBiosampleConfig(assembly, {
  onSubmit: handleSubmit,
  onCancel: handleCancel,
  onReset: handleReset,
});
<TrackSelect config={biosampleConfig} />
```

---

### Phase 5: Cleanup & Documentation

#### 5.1 Remove Old Files
- Delete or deprecate old biosample-specific code in root TrackSelect folder
- Move biosample JSON data to `examples/biosample/Data/`

#### 5.2 Create Documentation
**File**: `TrackSelect/README.md` (new)

Document:
1. How to create a custom TrackSelect configuration
2. Biosample example walkthrough
3. API reference for all config options
4. Examples for other data types (genes, variants, etc.)

#### 5.3 Fix Remaining Issues
From original analysis:
- Fix memory leak (timeout cleanup)
- Fix type assertions
- Fix map key bug
- Remove CustomToolbar.tsx dead code

---

## File Structure - After Refactoring

```
TrackSelect/
├── README.md                     # Documentation
├── TrackSelect.tsx               # Generic component (refactored)
├── index.ts                      # Public exports
│
├── generic/                      # Generic core (new)
│   ├── types.ts                 # Generic types and interfaces
│   ├── store.ts                 # Generic selection store
│   ├── treeBuilder.ts           # Generic tree building logic
│   └── index.ts
│
├── examples/                     # Example configurations (new)
│   └── biosample/
│       ├── types.ts             # Biosample-specific types
│       ├── constants.ts         # Assay types, ontology types, colors
│       ├── columns.tsx          # Biosample column builders
│       ├── dataLoader.ts        # Load and flatten biosample data
│       ├── config.ts            # Biosample config factory
│       ├── Data/                # Biosample JSON data
│       │   ├── humanBiosamples.json
│       │   └── mouseBiosamples.json
│       └── index.ts
│
├── DataGrid/                     # DataGrid components (refactored)
│   ├── DataGridWrapper.tsx      # Generic wrapper
│   ├── GroupingCell.tsx         # Generic grouping cell
│   └── index.ts
│
├── TreeView/                     # TreeView components (refactored)
│   ├── TreeViewWrapper.tsx      # Generic wrapper
│   ├── TreeItemComponents.tsx   # Generic tree item renderers
│   └── index.ts
│
└── [deprecated]/                 # Old files to remove
    ├── consts.ts                # Move biosample parts to examples/biosample
    ├── store.ts                 # Replaced by generic/store.ts
    ├── columns.tsx              # Replaced by examples/biosample/columns.tsx
    ├── dataGridHelpers.tsx      # Refactor generic parts, biosample to examples
    └── treeViewHelpers.tsx      # Replaced by generic/treeBuilder.ts
```

---

## Critical Files to Modify

### Phase 1 (New Files)
1. `generic/types.ts` - Core generic types
2. `generic/store.ts` - Generic selection store
3. `generic/treeBuilder.ts` - Generic tree building

### Phase 2 (New Files)
4. `examples/biosample/types.ts` - Biosample types
5. `examples/biosample/constants.ts` - Biosample constants
6. `examples/biosample/columns.tsx` - Biosample columns
7. `examples/biosample/dataLoader.ts` - Biosample data loading
8. `examples/biosample/config.ts` - Biosample config factory

### Phase 3 (Refactor Existing)
9. `TrackSelect.tsx` - Main component
10. `DataGrid/DataGridWrapper.tsx` - Generic DataGrid
11. `TreeView/TreeViewWrapper.tsx` - Generic TreeView

### Phase 4 (Update Usage)
12. Parent component using TrackSelect

### Phase 5 (Cleanup)
13. Remove/deprecate old files
14. Create README.md
15. Fix bugs from original analysis

---

## Verification Plan

### Functional Testing

#### Test 1: Biosample Config Works Identically
1. Create biosample config with GRCh38 assembly
2. Open TrackSelect dialog
3. Verify all existing functionality works:
   - Search for tracks (debounced)
   - Select/deselect tracks in DataGrid
   - Verify TreeView updates correctly
   - Toggle between grouping modes ("Default" vs "Sort by assay")
   - Remove tracks from TreeView using minus icons
   - Test Submit/Cancel/Reset buttons
   - Verify maxTracks limit (30) is enforced
4. Repeat with mm10 assembly

#### Test 2: Generic Architecture Extensibility
1. Create a simple test configuration with different data type:
   ```typescript
   type GeneRow = {
     id: string;
     chromosome: string;
     gene: string;
     type: string;
   };

   const geneConfig: TrackSelectConfig<GeneRow> = {
     rows: testGeneRows,
     rowById: testGeneRowById,
     columns: [
       { field: 'gene', headerName: 'Gene' },
       { field: 'chromosome', headerName: 'Chromosome' },
       { field: 'type', headerName: 'Type' },
     ],
     groupingModes: [
       { id: 'by-chr', label: 'By Chromosome', groupByFields: ['chromosome', 'type'] },
     ],
     searchConfig: {
       searchableFields: ['gene', 'chromosome', 'type'],
     },
     rootLabel: 'Genes',
     maxSelection: 50,
   };
   ```
2. Verify component works with this non-biosample configuration
3. Verify tree builds correctly with different grouping fields
4. Verify search works with different searchable fields

### Technical Verification

#### Code Quality Checks
1. Run TypeScript compiler - no new errors
2. Check bundle size - should be similar or smaller
3. Verify no unused imports
4. Check for remaining TODOs or commented code
5. Verify all exports are properly typed

#### Architecture Validation
1. Verify biosample-specific code is isolated to `examples/biosample/`
2. Verify `generic/` folder contains only data-agnostic code
3. Verify no biosample-specific types leak into generic code
4. Check that `TrackSelect.tsx` imports from `generic/` not `examples/`

### Bug Fixes Verification

From original analysis, verify these are fixed:
1. Memory leak - timeout cleanup on unmount
2. Type assertion bug - proper type guards
3. Map key inconsistency - consistent key usage
4. CustomToolbar removed - file deleted

### Expected Outcomes

**Code Organization**:
- Clear separation between generic and biosample-specific code
- Biosample becomes a configuration example
- Easy to create new configurations for other data types

**Lines of Code**:
- ~200-300 lines of new generic code
- ~400-500 lines of biosample example code
- ~500-700 lines removed from refactoring and cleanup
- Net reduction: ~100-200 lines

**Maintainability**:
- Single source of truth for biosample constants
- No code duplication
- Clear, documented API for creating configurations
- Type-safe generic implementation

**Functionality**:
- All existing biosample functionality preserved
- Component now works with any data type
- Easier to add new grouping modes
- Easier to customize columns and search
