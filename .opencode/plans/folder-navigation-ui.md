# Folder Navigation UI - Implementation Plan

## Overview

Add breadcrumb navigation and folder card selection UI to TrackSelect component. Users browse folders via cards, then drill into data grid. Breadcrumb shows location and enables back navigation.

---

## Code Philosophy

**Keep it simple:**

- Write straightforward, readable code
- Avoid over-engineering or unnecessary abstractions
- No fancy patterns unless truly needed
- Prioritize clarity over cleverness
- Minimal dependencies - use what's already in the project
- Focus on functionality that works, not impressive-looking code

---

## Architecture Changes

### Type Extensions

**File:** `/packages/ui/src/TrackSelect/folders/types.ts`

- Add optional `description?: string` to `FolderDefinition` interface

### New Components

1. **Breadcrumb** - Shows navigation path ("All Folders › Human Biosamples")
2. **FolderCard** - Individual card with title, description, count
3. **FolderList** - Vertical stack of FolderCards

### TrackSelect Modifications

- Add view state: `'folder-list' | 'folder-detail'`
- Conditionally render FolderList or DataGrid based on view
- Hide tabs when in folder detail view
- Show breadcrumb at all times

---

## Workflow

After completing each task:

1. **Ask for approval:** "Task [N] complete. Ready to commit? (yes/no/suggest changes)"

2. **If user says NO or suggests changes:**
   - Address feedback/make requested changes
   - Ask again: "Changes made. Ready to commit now? (yes/no/suggest changes)"
   - Repeat until user approves

3. **If user says YES:**
   - Check recent commit history with `git log --oneline -20`
   - Analyze commit message style (format, capitalization, convention)
   - Stage all relevant files with `git add`
   - Create commit matching the established style
   - Confirm with `git log -1` to show the new commit

---

## Tasks & Subtasks

### **Task 1: Type & Data Setup**

**Subtasks:**

1. Update `FolderDefinition` interface - add `description?: string`
2. Add descriptions to `humanBiosamplesFolder` definition
3. Add descriptions to `mouseBiosamplesFolder` definition

**Files Modified:**

- `/packages/ui/src/TrackSelect/folders/types.ts`
- `/packages/ui/src/TrackSelect/folders/biosamples/human.ts`
- `/packages/ui/src/TrackSelect/folders/biosamples/mouse.ts`

---

### **Task 2: Breadcrumb Component**

**Subtasks:**

1. Create `Breadcrumb.tsx` component
   - Props: `currentFolder: FolderDefinition | null`, `onNavigateToRoot: () => void`
   - Use MUI `Breadcrumbs` with `NavigateNextIcon`
   - Show "All Folders" (clickable) when in folder detail view
   - Show only "All Folders" when in folder list view
2. Create `index.ts` barrel export

**Files Created:**

- `/packages/ui/src/TrackSelect/Breadcrumb/Breadcrumb.tsx`
- `/packages/ui/src/TrackSelect/Breadcrumb/index.ts`

**Design Specs:**

- Typography: `body1`
- Padding: `py: 1.5, px: 2`
- Background: `grey.50` (subtle)
- Clickable items have hover state

---

### **Task 3: FolderCard Component**

**Subtasks:**

1. Create `FolderCard.tsx` component
   - Props: `folder: FolderDefinition`, `onClick: () => void`
   - MUI `Paper` with elevation 1, hover elevation 3
   - Display: title (h6), description (body2), count (caption)
   - Count format: `{folder.rowById.size.toLocaleString()} tracks available`
2. Create `index.ts` barrel export

**Files Created:**

- `/packages/ui/src/TrackSelect/FolderCard/FolderCard.tsx`
- `/packages/ui/src/TrackSelect/FolderCard/index.ts`

**Design Specs:**

- Padding: `p: 3`
- Hover: Elevation 3, subtle background overlay
- Transition: 0.2s ease-in-out
- Cursor: pointer
- Accessibility: role="button", keyboard support

---

### **Task 4: FolderList Component**

**Subtasks:**

1. Create `FolderList.tsx` component
   - Props: `folders: FolderDefinition[]`, `onFolderSelect: (folderId: string) => void`
   - MUI `Stack` with vertical layout, `spacing={2}`
   - Render `FolderCard` for each folder
   - Handle empty state
2. Create `index.ts` barrel export

**Files Created:**

- `/packages/ui/src/TrackSelect/FolderList/FolderList.tsx`
- `/packages/ui/src/TrackSelect/FolderList/index.ts`

**Design Specs:**

- Max width: 800px, centered with `mx: 'auto'`
- Container padding: `p: 3`
- Empty state: "No folders available"

---

### **Task 5: TrackSelect Integration**

**Subtasks:**

1. Add view state management
   - Type: `'folder-list' | 'folder-detail'`
   - Default: `'folder-list'` if multiple folders, else `'folder-detail'`
2. Add navigation handlers
   - `handleFolderSelect(folderId: string)` - switch to detail view
   - `handleNavigateToRoot()` - switch to list view
3. Update tab visibility logic
   - Only show tabs when: `currentView === 'folder-list' && folders.length > 1`
4. Conditional rendering
   - Always show Breadcrumb
   - Conditionally show: Tabs, ToolbarExtras, FolderList/DataGrid, action buttons
5. Handle single folder case
   - Skip folder list, go directly to detail view

**Files Modified:**

- `/packages/ui/src/TrackSelect/TrackSelect.tsx`

**Key Logic:**

```typescript
// View state
const [currentView, setCurrentView] = useState<'folder-list' | 'folder-detail'>(() =>
  folders.length > 1 ? 'folder-list' : 'folder-detail'
);

// Navigation handlers
const handleFolderSelect = (folderId: string) => {
  setActiveFolder(folderId);
  setCurrentView('folder-detail');
};

const handleNavigateToRoot = () => {
  setCurrentView('folder-list');
};

// Conditional rendering
{currentView === 'folder-list' ? (
  <FolderList folders={folders} onFolderSelect={handleFolderSelect} />
) : (
  <Stack direction="row" spacing={2}>
    {/* DataGrid + TreeView */}
  </Stack>
)}
```

---

## Testing Checklist

**Per Task:**

- [ ] Component renders without errors
- [ ] Props work as expected
- [ ] Styling matches specs

**Integration:**

- [ ] Navigate: folder list → detail → back to list
- [ ] Selections persist across views
- [ ] Single folder skips list view
- [ ] Tab visibility correct
- [ ] Keyboard navigation works
- [ ] Responsive on various screen sizes

---

## File Summary

**Created (6 files):**

- Breadcrumb component (2 files)
- FolderCard component (2 files)
- FolderList component (2 files)

**Modified (4 files):**

- Types definition (1)
- Folder definitions (2)
- TrackSelect main component (1)

---

## Edge Cases

1. **Single folder** - Skip folder list, breadcrumb shows folder name only
2. **Empty folders** - Show "0 tracks available", card still clickable
3. **No folders** - FolderList shows "No folders available"
4. **Long text** - Descriptions wrap, titles truncate if needed

---

**Status:** Ready for implementation
