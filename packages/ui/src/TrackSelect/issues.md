# TrackSelect Code Review Issues

## Critical Issues

### 1. Bug: Hardcoded `rowById` Import Breaks Multi-Assembly Support

**File:** `TreeViewWrapper.tsx:3,28-42`

```typescript
import { rowById } from "../consts";
```

**Problem:** The `rowById` from `consts.ts` is always built with `"GRCh38"` (human assembly). When the store is created with `mm10` assembly, the TreeViewWrapper will fail to find rows because it's looking in the wrong map.

**Fix:**
```typescript
// Remove: import { rowById } from "../consts";
// Add inside component:
const rowById = store((s) => s.rowById);
```

---

### 2. Bug: Memory Leak from Missing Timeout Cleanup

**File:** `TrackSelect.tsx:117,170-173`

**Problem:** No cleanup on unmount. If component unmounts while timeout is pending, it will try to update state on an unmounted component.

**Fix - Add useEffect after line 118:**
```typescript
useEffect(() => {
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, []);
```

---

### 3. Bug: Unsafe Type Assertion with `as any`

**File:** `TrackSelect.tsx:254-256`

```typescript
const allIds: Set<string> =
  (newSelection && (newSelection as any).ids) ?? new Set<string>();
```

**Problem:** Using `as any` bypasses TypeScript safety.

**Fix:**
```typescript
let allIds: Set<string>;
if (
  newSelection &&
  typeof newSelection === 'object' &&
  'ids' in newSelection &&
  newSelection.ids instanceof Set
) {
  allIds = newSelection.ids as Set<string>;
} else {
  allIds = new Set<string>();
}
```

---

### 4. Bug: Inconsistent Map Keys in `buildSortedAssayTreeView`

**File:** `TreeView/treeViewHelpers.tsx:134,145`

```typescript
// Line 134 (get):
let expNode = sampleAssayMap.get(row.displayname + row.id);
// Line 145 (set):
sampleAssayMap.set(row.displayname + row.assay, expNode);
```

**Problem:** Different keys used for get vs set - lookup will always return `undefined`.

**Fix Line 134:**
```typescript
let expNode = sampleAssayMap.get(row.displayname + row.assay);
```

---

## Code Duplication Issues

### 5. Duplicate Assay Formatting Functions

**Files:**
- `DataGrid/dataGridHelpers.tsx:17-38` - `formatAssayType`
- `TreeView/treeViewHelpers.tsx:43-64` - `formatAssayName`

Nearly identical switch statements.

**Fix - Create shared utility in `consts.ts`:**
```typescript
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

export function formatAssayType(assay: string): string {
  return ASSAY_DISPLAY_MAP[assay.toLowerCase()] ?? assay;
}
```

---

### 6. Duplicate Root Tree Item Object (6 occurrences)

**File:** `TrackSelect.tsx` - Lines 83, 95, 108, 134, 145, 222

Same object literal repeated 6 times:
```typescript
{
  id: "1",
  isAssayItem: false,
  label: "Biosamples",
  icon: "folder",
  children: [],
  allRowInfo: [],
}
```

**Fix - Add to `consts.ts`:**
```typescript
export const createRootTreeItem = (): TreeViewBaseItem<ExtendedTreeItemProps> => ({
  id: "1",
  isAssayItem: false,
  label: "Biosamples",
  icon: "folder",
  children: [],
  allRowInfo: [],
});
```

---

### 7. Duplicate Column renderCell Logic

**File:** `DataGrid/columns.tsx:19-92`

Similar renderCell implementations across multiple column definitions.

**Fix - Create helper functions:**
```typescript
const renderGroupCell = (params: GridRenderCellParams<RowInfo>) => {
  if (params.rowNode.type !== "group" || params.value === undefined) {
    return null;
  }
  return <div><b>{params.value}</b></div>;
};
```

---

### 8. Duplicate Tree Building Logic

**File:** `TreeView/treeViewHelpers.tsx:73-243`

`buildSortedAssayTreeView` and `buildTreeView` share common patterns.

**Fix - Extract shared logic:**
```typescript
function getSelectedRows(
  selectedIds: string[],
  rowById: Map<string, RowInfo>
): RowInfo[] {
  return selectedIds.reduce<RowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);
}
```

---

## Unused Code

### 9. Unused `CustomToolbar` Component

**File:** `DataGrid/CustomToolbar.tsx`

Entire file defines a component that is never imported or used.

**Recommendation:** Delete the file or integrate into `DataGridWrapper.tsx`.

---

### 10. Unused Exports in consts.ts

**File:** `consts.ts:102-108`

```typescript
export const isTrackId = (id: string): boolean => rowById.has(id);
export const getActiveTracks = (selectedIds: Set<string>): Set<string> =>
  new Set(Array.from(selectedIds).filter(isTrackId));
```

Never used anywhere.

**Recommendation:** Remove or document intended usage.

---

## Type Safety Issues

### 11. Using `any` Type in getNestedValue

**File:** `DataGrid/dataGridHelpers.tsx:65-67`

```typescript
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}
```

**Fix:** Remove function and access properties directly:
```typescript
const data = tracksData.tracks;
```

---

### 12. Non-Null Assertion Without Safety Check

**File:** `TreeView/TreeViewWrapper.tsx:87`

```typescript
({items[0].allRowInfo!.length} search results)
```

**Fix:**
```typescript
({items[0]?.allRowInfo?.length ?? 0} search results)
```

---

### 13. Implicit Any in FuseOptionKey

**File:** `types.ts:14`

```typescript
keyWeightMap: FuseOptionKey<any>[];
```

**Fix:**
```typescript
keyWeightMap: FuseOptionKey<TrackInfo | RowInfo>[];
```

---

## Performance Issues

### 14. Redundant useEffect Dependency

**File:** `DataGrid/DataGridWrapper.tsx:48-50`

**Fix - Memoize baseVisibility:**
```typescript
const baseVisibility = useMemo<GridColumnVisibilityModel>(() =>
  sortedAssay
    ? { assay: false, ontology: false, displayname: false, id: false }
    : { ontology: false, displayname: false, assay: false, id: false },
  [sortedAssay]
);
```

---

### 15. Eager Module Initialization

**File:** `consts.ts:95-97`

```typescript
const humanData = buildRowsForAssembly("GRCh38");
export const rows = humanData.rows;
export const rowById = humanData.rowById;
```

Runs at module load time even if never used.

**Fix - Lazy initialization:**
```typescript
let _humanData: ReturnType<typeof buildRowsForAssembly> | null = null;

function getHumanData() {
  if (!_humanData) {
    _humanData = buildRowsForAssembly("GRCh38");
  }
  return _humanData;
}
```

---

## Code Quality Issues

### 16. Magic Number for maxTracks

**File:** `store.ts:19`

```typescript
maxTracks: 30,
```

**Fix:**
```typescript
const DEFAULT_MAX_TRACKS = 30;
maxTracks: DEFAULT_MAX_TRACKS,
```

---

### 17. Redundant Null Check

**File:** `TreeView/treeViewHelpers.tsx:191-194`

The `reduce` already filters out falsy values, so the check in `forEach` is redundant.

---

### 18. Redundant has() + get()

**File:** `store.ts:36-43`

```typescript
if (storeRowById.has(id)) {
  const row = storeRowById.get(id);
  if (row) { // Redundant after has()
```

**Fix:**
```typescript
const row = storeRowById.get(id);
if (row) {
  map.set(id, row);
}
```

---

### 19. Commented-Out Code

**File:** `store.ts:9-10`

```typescript
// const isAutoGeneratedId = (id: string) => id.startsWith("auto-generated-row-");
```

**Recommendation:** Remove or use.

---

### 20. Typo in Comment

**File:** `types.ts:22`

```typescript
* Types for the JSON-formatted tracks fomr modifiedHumanTracks.json
```

Should be "from".

---

### 21. Missing Return Type Annotations

**File:** `TreeView/treeViewHelpers.tsx:288`

```typescript
export function AssayIcon(type: string) {
```

**Fix:**
```typescript
export function AssayIcon(type: string): JSX.Element {
```

---

### 22. Hardcoded Color Values

**File:** `TreeView/treeViewHelpers.tsx:289-298`

**Recommendation:** Move to `consts.ts` as `ASSAY_COLORS` for reusability.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 4 |
| Medium | 5 |
| Low | 9 |
| **Total** | **22** |
