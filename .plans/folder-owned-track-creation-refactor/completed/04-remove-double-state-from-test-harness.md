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

**Built:** Simplified `packages/ui/test/main.tsx` so the harness now only creates the browser stores, opens `TrackSelect`, passes folder and managed-ID props, and renders `Browser`. The old managed selection-to-track pipeline, session track persistence, and callback reinjection logic were removed.

**Decisions:** I kept the harness track store empty on startup and let `TrackSelect` seed managed tracks through its existing startup flow. I did not preserve external track decoration in this slice because the remaining decoration path was coupled to the removed harness-owned track persistence and callback injection code, and there is not yet a small browser-facing hook for reapplying those decorations inside `TrackSelect`.

**Deviations:** Manual harness QA was not run because the repo instructions explicitly say not to run `pnpm run dev`. Decoration support was intentionally skipped in this slice for the same reason noted above: keeping it would have required reintroducing the kind of external integration glue this slice is meant to remove.

**Files:** Modified `packages/ui/test/main.tsx` and `.plans/folder-owned-track-creation-refactor/completed/04-remove-double-state-from-test-harness.md`.

**Notes for next slice:** If decorated or callback-enabled tracks still matter, the next slice should add an explicit decoration hook near the internal managed-track creation path rather than rebuilding harness-owned persistence or diff logic. Verified commands: `pnpm --filter @weng-lab/genomebrowser-ui test` and `pnpm --filter @weng-lab/genomebrowser-ui build`.
