# Slice 1: Tracer Bullet Public MOHD Folder

## Dependencies

None.

## Description

Add the first end-to-end MOHD path through TrackSelect for `GRCh38` using only `open_access=True` rows from the TSV. Generate minimal JSON grouped by `sampleId`, show the MOHD folder in TrackSelect, render expandable sample groups, and support at least one straightforward non-WGBS public file flow from data generation through final browser track creation on submit.

## Expected Behaviors Addressed

- The MOHD folder appears alongside the existing TrackSelect folders for `GRCh38`.
- The user opens the MOHD folder and sees rows grouped by `sampleId`.
- Closed-access files never appear in the MOHD folder.
- Each non-WGBS public file appears as its own selectable leaf.
- Selecting MOHD rows and submitting TrackSelect yields usable genome browser tracks.
- Track names come from `fileName`.

## Acceptance Criteria

- [ ] A MOHD generator produces JSON from the TSV using only `open_access=True` rows.
- [ ] The MOHD folder is registered for `GRCh38` and groups rows by `sampleId` in TrackSelect.
- [ ] Selecting a supported non-WGBS public MOHD row and submitting TrackSelect creates a usable browser track.

## QA

1. Open TrackSelect on a `GRCh38` browser.
2. Confirm a `MOHD` folder is available.
3. Open the MOHD folder and confirm rows are grouped by `sampleId`.
4. Expand a sample with supported public non-WGBS rows.
5. Confirm no closed-access files are shown.
6. Select one visible public leaf.
7. Submit TrackSelect.
8. Confirm the browser receives a usable track named from the row `fileName`.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
