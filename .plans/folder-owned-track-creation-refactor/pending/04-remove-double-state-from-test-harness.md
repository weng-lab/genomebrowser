# Slice 4: Remove Double-State From Test Harness

## Dependencies

Slice 3: TrackSelect Mutates TrackStore Directly.

## Description

Simplify `packages/ui/test/main.tsx` so it no longer owns managed selection state, track generation logic, or track persistence logic. Keep only the browser setup, modal open/close wiring, and the minimum integration required to render `TrackSelect` and `Browser`. If preserving track decoration is not obviously simple in the new architecture, skip it here and document that decision in completion notes.

## Expected Behaviors Addressed

- The test harness becomes readable and easy to port.
- Sites no longer need the current giant integration block.

## Acceptance Criteria

- [ ] The test harness no longer contains the old managed selection-to-track pipeline.
- [ ] The test harness remains able to open `TrackSelect` and render the browser with managed tracks.
- [ ] If external track decoration is not kept in this slice, the omission and rationale are recorded in completion notes for a follow-up slice.

## QA

1. Open the local UI test harness.
2. Confirm the modal still opens, managed tracks can be changed, and the browser reflects those changes.
3. Review `packages/ui/test/main.tsx` and confirm the old selection, generation, and persistence glue code is gone.
4. If decoration support was included, verify the decorated track behaviors still work.
5. If decoration support was skipped, verify core track management still works cleanly without it.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
