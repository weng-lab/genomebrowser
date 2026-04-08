# Slice 2: Broaden Public Non-WGBS Coverage

## Dependencies

Slice 1: Tracer Bullet Public MOHD Folder

## Description

Expand the MOHD flow to cover all intended non-WGBS public file rows, not just the tracer-bullet subset. Use the known assay-folder mapping to generate URLs correctly, keep the JSON minimal, and allow mixed public file types to coexist under the same sample while still translating selections into usable browser tracks.

## Expected Behaviors Addressed

- Expanding a sample shows all public selectable tracks for that sample, even if file types are mixed.
- Closed-access files never appear in the MOHD folder.
- Each non-WGBS public file appears as its own selectable leaf.
- Selecting MOHD rows and submitting TrackSelect yields usable genome browser tracks.

## Acceptance Criteria

- [ ] The generator supports all intended non-WGBS public MOHD file rows using the correct assay-path mapping.
- [ ] Mixed public non-WGBS file leaves render correctly under the same `sampleId` group.
- [ ] Submitting multiple mixed non-WGBS selections creates usable browser tracks for each selected row.

## QA

1. Open TrackSelect on a `GRCh38` browser.
2. Open the MOHD folder.
3. Expand one or more samples with different public non-WGBS file types.
4. Confirm the sample contains mixed public leaves where expected.
5. Select several leaves from one or more samples.
6. Submit TrackSelect.
7. Confirm each selected row becomes a usable browser track.
8. Spot-check generated URLs against the assay-path mapping for ATAC and RNA.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
