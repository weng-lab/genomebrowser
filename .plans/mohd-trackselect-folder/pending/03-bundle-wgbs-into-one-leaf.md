# Slice 3: Bundle WGBS Into One Leaf

## Dependencies

Slice 1: Tracer Bullet Public MOHD Folder

## Description

Detect public WGBS rows after filtering and collapse each sample's WGBS component files into one synthetic selectable row. Store only the minimal nested URL structure needed for methylC assembly, show a single WGBS leaf under the sample in TrackSelect, and translate that row into a working methylC browser track on submit.

## Expected Behaviors Addressed

- Each sample with public WGBS members shows one synthetic WGBS leaf instead of 8 separate WGBS source files.
- Closed-access files never appear in the MOHD folder.
- Selecting MOHD rows and submitting TrackSelect yields usable genome browser tracks.

## Acceptance Criteria

- [ ] Public WGBS source rows are bundled into one synthetic WGBS row per eligible sample.
- [ ] The MOHD folder shows one WGBS leaf per eligible sample rather than individual WGBS source files.
- [ ] Selecting a WGBS leaf and submitting TrackSelect creates a usable methylC browser track.

## QA

1. Open TrackSelect on a `GRCh38` browser.
2. Open the MOHD folder.
3. Expand a sample with public WGBS data.
4. Confirm only one WGBS leaf is shown for that sample.
5. Confirm the component WGBS files do not appear as separate leaves.
6. Select the WGBS leaf.
7. Submit TrackSelect.
8. Confirm the browser receives a usable methylC track with the expected strand/context URL structure.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
