# Implementation Plan: Core Collection Column for Biosample Tracks

## Overview

Add a "Core Collection" column to the biosample tracks data grid. This column displays a checkmark icon for samples that have all assays available, helping users quickly identify the most comprehensive samples.

---

## Workflow

- When a feature OR large task (many changes) is done, **suggest doing a git commit** with a short summary of the changes.
- If a commit is done, mark the feature/task(s) as complete.

---

## Feature 1: Add Core Collection Column to Biosample Tracks

### Tasks

- [x] **1.1 Update TypeScript types**
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/shared/types.ts`
  - Add `core?: boolean` to `BiosampleTrackInfo` type
  - Add `coreCollection: boolean` to `BiosampleRowInfo` type

- [x] **1.2 Create column definition**
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/shared/columns.tsx`
  - Import `Check` icon from `@mui/icons-material/Check`
  - Create `coreCollectionCol` column definition with:
    - Field: `"coreCollection"`
    - Header: `"Core Collection"`
    - Type: `"boolean"`
    - Render cell: Show `<Check color="primary" />` when true, null otherwise

- [x] **1.3 Add column to data grid configurations**
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/shared/columns.tsx`
  - Insert `coreCollectionCol` into `defaultColumns` array (between `sampleTypeCol` and `lifeStageCol`)
  - Insert `coreCollectionCol` into `sortedByAssayColumns` array (between `sampleTypeCol` and `lifeStageCol`)

- [x] **1.4 Update data transformation to include coreCollection field**
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/shared/createFolder.ts`
  - Update `flattenTrackIntoRows()` to destructure `core` from track
  - Add `coreCollection: core ?? false` to the returned row object

**Commit suggestion:** After completing tasks 1.1-1.4, suggest commit: "feat: add Core Collection column to biosample tracks data grid"

---

## Feature 2: Populate Core Collection Data (User Action Required)

### Tasks

- [ ] **2.1 Add core field to human biosample data**
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/data/human.json`
  - Add `"core": true` to designated core collection sample tracks
  - (User to provide list of core collection samples)

- [ ] **2.2 Add core field to mouse biosample data** _(when data is available)_
  - File: `packages/ui/src/TrackSelect/Folders/biosamples/data/mouse.json`
  - Add `"core": true` to designated core collection sample tracks
  - (User to provide list of core collection samples)

**Commit suggestion:** After completing task 2.1, suggest commit: "data: mark core collection samples in human biosample data"

**Commit suggestion:** After completing task 2.2, suggest commit: "data: mark core collection samples in mouse biosample data"

---

## Reference: JSON Data Format

When adding core collection samples to the JSON files:

```json
{
  "name": "sample-name",
  "ontology": "tissue-type",
  "lifeStage": "adult",
  "sampleType": "tissue",
  "displayName": "Human-readable name",
  "core": true,
  "assays": [...]
}
```

Note: Only add `"core": true` for core collection samples. Other samples should not have this field (it will default to `false`).
