# MOHD TrackSelect Folder

## Problem

I want to add a new MOHD folder to TrackSelect that behaves like the existing folder system, but is driven from a TSV source file and grouped by `sampleId`. The MOHD data already exists, but it needs to be converted into a compact JSON format the UI can consume directly. I only want public data included, and I want WGBS to show up as one selectable methylC-style leaf per sample instead of exposing all of its component files individually. I also need the TrackSelect flow to turn selected MOHD rows into real genome browser tracks, not just display them.

## Solution

Add a MOHD-specific data generation step that reads the TSV, filters to public rows first, groups data by `sampleId`, and emits a minimal JSON file tailored for TrackSelect. The folder implementation will flatten that grouped JSON into one selectable row per visible track under each sample.

The MOHD folder will use a simple sample-grouped view:

- top-level grouping by `sampleId`
- expanding a sample shows one leaf per public track/file
- WGBS is bundled into one synthetic leaf per sample

The TrackSelect UI work includes both:

- rendering the MOHD folder in the selector
- translating selected MOHD rows into final browser track configs at selection/submit time

The JSON stays small by storing only the row metadata and unique data needed to construct browser track configs later. Shared defaults such as colors, heights, title sizing, and display modes remain in code and are applied when selected rows are converted into actual browser tracks.

## Expected Behavior

- The MOHD folder appears alongside the existing TrackSelect folders for `GRCh38`.
- The user opens the MOHD folder and sees rows grouped by `sampleId`.
- Expanding a sample shows all public selectable tracks for that sample, even if file types are mixed.
- Closed-access files never appear in the MOHD folder.
- Each non-WGBS public file appears as its own selectable leaf.
- Each sample with public WGBS members shows one synthetic WGBS leaf instead of 8 separate WGBS source files.
- Selecting MOHD rows and submitting TrackSelect yields usable genome browser tracks.
- Track names come from `fileName`.

## Implementation Decisions

- The source of truth is the TSV, but the UI consumes generated JSON.
- Filtering happens before any shaping:
- discard all `open_access=False` rows first
- only then build visible MOHD rows from the remaining public set
- The generated JSON is grouped by `sampleId` and contains a `rows` collection per sample.
- The JSON is intentionally minimal:
- keep only grouping/display fields and unique track-construction fields
- do not duplicate static config defaults across every row
- do not store a full track config object per row
- do not store a template key
- Non-WGBS rows are one row per public file.
- WGBS rows are bundled into one synthetic row per sample, built only from the filtered public WGBS files.
- The synthetic WGBS row stores the nested strand/context URL structure needed to build a methylC track later.
- Non-WGBS rows do not store an explicit final track type in JSON.
- Final track config assembly happens in the UI code at selection/submit time by combining:
- row-specific MOHD data
- shared in-code defaults for each supported track family
- The TrackSelect-side MOHD feature includes this row-to-track translation layer as part of the implementation, not as a separate follow-up.
- URL generation uses the MOHD download pattern:
- `https://downloads.mohd.org/{mappedAssay}/{sampleId}/{filename}`
- The assay-to-path mapping is now:
- `WGBS -> 1_WGBS`
- `ATAC -> 2_ATAC`
- `RNA_SEQ -> 3_RNA`
- The MOHD folder uses a dedicated shared implementation instead of trying to reuse biosample-specific assay-toggle behavior.
- The selected-items tree mirrors the folder structure:
- root folder
- sample
- selected leaves

## Testing Approach

- Verify the generator filters out all `open_access=False` rows.
- Verify the generator groups output by `sampleId`.
- Verify non-WGBS public files become one row each.
- Verify WGBS source files are not emitted individually and instead collapse into one synthetic row per sample.
- Verify generated URLs use the mapped assay path, sample ID, and filename correctly.
- Verify the JSON stays minimal and does not duplicate static config defaults.
- Verify the MOHD folder is registered for `GRCh38` and renders in TrackSelect.
- Verify the grid groups by `sampleId` and expanding a sample shows the expected leaves.
- Verify selected MOHD rows are translated into valid browser track configs at submit time.
- Verify mixed file types under the same sample do not break selection or tree rendering.
- Add focused tests around the WGBS bundling logic, since that is the main non-trivial transformation.

## Out of Scope

- Assemblies beyond `GRCh38`.
- Biosample-style alternate sort modes or toggles.
- Broad refactors of TrackSelect's shared folder architecture.
- Supporting closed-access files in any form.
- Solving future MOHD-specific track families beyond the currently discussed public file rows and bundled WGBS behavior.
