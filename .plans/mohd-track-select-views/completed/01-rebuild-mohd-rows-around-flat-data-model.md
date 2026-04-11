# Slice 1: Rebuild MOHD rows around the new flat data model

## Dependencies

None

## Description

Rework the MOHD folder so it consumes the new flat `human.json` structure and turns it into logical Track Select rows. Non-WGBS records remain one file per leaf. WGBS records are regrouped per sample so each sample produces one collapsed `DNA Methylation` leaf backed by the 8 MethylC bigWigs, plus one separate cytosines `.bigBed` leaf that remains independently selectable. MOHD track creation is updated to generate URLs from the normalized row metadata and create the correct track type for each logical leaf.

## Expected Behaviors Addressed

- Each leaf represents a selectable browser track.
- For non-WGBS data, each source file remains one selectable leaf.
- For each WGBS sample, the 8 methylation bigWigs are collapsed into one `DNA Methylation` leaf.
- For each WGBS sample, the cytosine-level `.bigBed` file remains a separate selectable leaf.
- The visible leaf label is `description`, not the raw filename.
- `filename` is kept internal and used for identity and URL construction where needed.
- Selecting a MOHD leaf creates the correct browser track for that logical entry.
- Generated MOHD track titles combine sample ID and description so rendered tracks are easy to distinguish.

## Acceptance Criteria

- [ ] MOHD folder loading uses the new flat row model instead of the old nested sample structure.
- [ ] WGBS rows are regrouped per `sample_id` into one MethylC leaf plus one separate cytosines leaf.
- [ ] MOHD track creation generates URLs from ome mapping, sample ID, and filename, and produces the correct track type for each logical row.

## QA

1. Open Track Select and navigate to the MOHD folder.
2. Verify non-WGBS samples still show one row per source file.
3. Verify each WGBS sample shows exactly two logical leaves: one `DNA Methylation` entry and one cytosine-level entry.
4. Select one ATAC or RNA row and confirm it adds a file-backed track with a generated URL.
5. Select one WGBS `DNA Methylation` row and confirm it adds a MethylC track.
6. Select one WGBS cytosines row and confirm it adds a BigBed track.
7. Confirm MOHD track titles use sample ID plus description instead of raw filename.

## Completion

**Built:** Reworked MOHD to load the new flat JSON model, collapse each WGBS sample into one logical `DNA Methylation` MethylC row plus one separate cytosines BigBed row, and generate MOHD track URLs/titles from normalized row metadata.

**Decisions:** Added a shared MOHD config for ome labels, placeholder colors, and download path mapping. Switched the MOHD leaf field to `description`. Used `folderId/sampleId` as the logical ID for collapsed WGBS methylation rows and preserved file-backed IDs for all other rows.

**Deviations:** The full `packages/ui` build still fails because of pre-existing TypeScript errors outside MOHD. Slice verification was done with focused MOHD Vitest coverage instead. RNA `.tsv.gz` rows remain in the folder model, but the current MOHD track factory still returns `null` for unsupported non-browser file types because the browser does not have an existing renderer for those files in this slice.

**Files:** Modified `packages/ui/src/TrackSelect/Folders/mohd/shared/types.ts`, `packages/ui/src/TrackSelect/Folders/mohd/shared/columns.tsx`, `packages/ui/src/TrackSelect/Folders/mohd/shared/createFolder.ts`, `packages/ui/src/TrackSelect/Folders/mohd/shared/toTrack.ts`, `packages/ui/src/TrackSelect/Folders/mohd/human.ts`, and `packages/ui/test/folders.test.ts`. Added `packages/ui/src/TrackSelect/Folders/mohd/shared/config.ts`.

**Notes for next slice:** MOHD now exposes `description`, `ome`, `site`, `sampleId`, `sex`, and `status` on each logical row. The shared ome config is ready to be reused for the upcoming `Ome`/`Site` views and colored ome rendering.
