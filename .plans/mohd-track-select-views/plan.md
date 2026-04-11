# MOHD Track Select Views And Display Refresh

## Problem

I want the MOHD folder in Track Select to reflect the new metadata model and present files in a way that matches how people browse this dataset. The current MOHD folder is built around the old data shape, groups by the wrong fields, and does not visually distinguish the three omes the way biosamples does for assay labels. It also treats flattened WGBS source files as independent rows when most of them should be combined into one logical methylation track per sample.

## Solution

Rebuild the MOHD folder around the new flat row model from `human.json`, treating each JSON entry as a source file record and transforming those records into the UI row model used by Track Select.

Most rows will remain one file per selectable leaf. WGBS will be handled specially: for each WGBS sample, the 8 bigWig files that map directly to the browser's MethylC config will be collapsed into one logical `DNA Methylation` leaf, while the separate cytosine-level `.bed.gz` file remains its own selectable leaf.

Add two folder views that organize the same logical leaves in different ways: one view centered on ome and one centered on site. Normalize ome values into user-facing labels and a shared config object that also carries placeholder colors and URL path mappings. Use that same config to render colored ome squares in both the data grid grouping labels and the selected tree view, following the biosample UI pattern.

Track creation will continue to be folder-owned, but it will be updated to derive remote file URLs from row metadata rather than reading them directly from the data file.

## Expected Behavior

- When the user opens the MOHD folder, they can switch between an `Ome` view and a `Site` view.
- In the `Ome` view, logical leaves are grouped by ome, then site, then sample.
- In the `Site` view, logical leaves are grouped by site, then ome, then sample.
- Each leaf represents a selectable browser track.
- For non-WGBS data, each source file remains one selectable leaf.
- For each WGBS sample, the 8 methylation bigWigs are collapsed into one `DNA Methylation` leaf.
- For each WGBS sample, the cytosine-level `.bed.gz` file remains a separate selectable leaf.
- The visible leaf label is `description`, not the raw filename.
- `filename` is kept internal and used for identity and URL construction where needed.
- Grouped fields stay hidden in the grid, so the table shows the leaf label plus the remaining metadata columns.
- Ome labels render with a small colored square in the data grid anywhere ome is shown as a grouping label.
- Ome labels render with the same small colored square in the selected tree view.
- Selecting a MOHD leaf creates the correct browser track for that logical entry.
- Generated MOHD track titles combine sample ID and description so rendered tracks are easy to distinguish.

## Implementation Decisions

- The MOHD source data is now a flat array, so the folder model should treat each JSON entry as an input record and transform those records into logical UI rows.
- The folder row type should normalize JSON keys into internal UI fields while preserving original filenames for identity and URL generation.
- `description` is the user-facing leaf field for all MOHD views.
- For non-WGBS rows, `description` should be copied directly from `file_type`.
- For collapsed WGBS MethylC rows, `description` should be the static label `DNA Methylation`.
- For the separate WGBS cytosines `.bed.gz` row, `description` should remain the original `file_type`.
- The folder should define two explicit views instead of relying on a single default grouping:
  - `Ome`: `ome -> site -> sample`
  - `Site`: `site -> ome -> sample`
- View definitions should follow the same folder-level pattern already used by biosamples so the Track Select container does not need MOHD-specific branching.
- Ome display concerns should live in a single MOHD config object that maps raw ome keys to:
  - display label
  - placeholder color
  - remote URL path segment
- `ome` display values should be normalized to `ATAC`, `RNA`, and `WGBS`.
- Grouped fields should remain hidden in the data grid, so each view only shows the leaf grouping column plus the remaining non-grouped metadata columns.
- The selected tree currently has assay-specific highlight metadata, so MOHD should plug into the same rendering path by extending that concept to support ome-highlighted items rather than adding one-off tree logic.
- The MOHD grouping cell should be folder-specific, like biosamples, so colored ome labels are isolated to MOHD behavior.
- Most MOHD rows should continue to use a file-backed identity based on the generated row ID.
- Collapsed WGBS MethylC rows should use `sample_id` as the logical row identity because one sample becomes one logical methylation track.
- The collapsed WGBS row should carry the 8 filenames in the same plus/minus and context structure used by the browser's `MethylCConfig`:
  - `plusStrand.cpg`
  - `plusStrand.chg`
  - `plusStrand.chh`
  - `plusStrand.depth`
  - `minusStrand.cpg`
  - `minusStrand.chg`
  - `minusStrand.chh`
  - `minusStrand.depth`
- WGBS regrouping should be driven by `sample_id`, with filename pattern matching used to map the 8 bigWig files into the MethylC structure.
- The WGBS cytosines `.bed.gz` file must not be collapsed and should remain its own BigBed-style leaf.
- MOHD track creation should derive URLs from normalized row fields using:
  - base host
  - ome path mapping
  - sample ID
  - filename
- The same URL-generation rule applies to all MOHD-backed files, including the WGBS cytosines BigBed file and each filename inside the collapsed WGBS MethylC payload.
- The browser track title should be built from sample ID and description rather than filename.

## Testing Approach

- Add tests for MOHD folder construction from the new flat data shape.
- Add tests for WGBS regrouping so each WGBS sample produces:
  - one collapsed `DNA Methylation` logical row
  - one separate cytosines `.bed.gz` row
- Add tests that verify the 8 WGBS bigWig filenames are mapped into the correct `MethylCConfig.urls` structure.
- Add tests for view definitions so the folder exposes both `Ome` and `Site` with the expected grouping order.
- Add tests for selection tree building to verify the selected tree follows the active MOHD view hierarchy.
- Add tests for MOHD track creation to verify generated titles and generated URLs from the ome mapping.
- Add rendering-focused tests for the MOHD grouping cell and tree item so ome labels receive the expected colored marker treatment.
- Keep tests centered on observable behavior and folder contracts rather than duplicating implementation details.

## Out of Scope

- Final production ome colors.
- Adding more MOHD views beyond `Ome` and `Site`.
- Changing the surrounding Track Select layout outside what is needed to support MOHD’s new grouping and icon rendering.
- Broad refactors unrelated to MOHD beyond the minimal generalization needed for shared tree highlight rendering.
