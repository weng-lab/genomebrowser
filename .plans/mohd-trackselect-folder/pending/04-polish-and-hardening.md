# Slice 4: Polish and Hardening

## Dependencies

Slice 2: Broaden Public Non-WGBS Coverage

Slice 3: Bundle WGBS Into One Leaf

## Description

Harden the MOHD generator and TrackSelect integration with focused tests and cleanup. Cover filtering, grouping, URL generation, mixed file rendering, submit-time track assembly, and WGBS bundling behavior. Tighten any edge handling discovered during earlier slices while keeping the generated JSON compact.

## Expected Behaviors Addressed

- Closed-access files never appear in the MOHD folder.
- Expanding a sample shows all public selectable tracks for that sample, even if file types are mixed.
- Each sample with public WGBS members shows one synthetic WGBS leaf instead of 8 separate WGBS source files.
- Selecting MOHD rows and submitting TrackSelect yields usable genome browser tracks.

## Acceptance Criteria

- [ ] Focused tests cover filtering, grouping, URL generation, non-WGBS row generation, and WGBS bundling.
- [ ] TrackSelect rendering and submit-time track assembly are verified for both non-WGBS and WGBS paths.
- [ ] The generated MOHD JSON remains minimal and does not duplicate static defaults.

## QA

1. Run the relevant MOHD generator and TrackSelect tests.
2. Open TrackSelect on a `GRCh38` browser.
3. Verify one sample with non-WGBS public rows and one sample with public WGBS data.
4. Confirm sample grouping, mixed leaf rendering, and WGBS bundling still behave correctly.
5. Select representative non-WGBS and WGBS rows.
6. Submit TrackSelect.
7. Confirm the browser receives usable tracks for both paths.
8. Spot-check the generated JSON to confirm it stays compact and excludes closed-access data.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
