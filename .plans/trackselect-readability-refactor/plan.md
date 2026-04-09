# TrackSelect Readability Refactor

## Problem

`TrackSelect` is doing too many jobs at once, which makes it hard to read and reason about. It mixes modal UI, folder navigation, draft selection state, submit behavior, runtime config overrides, derived tree and grid data, and dialog state in one component. The result is a lot of scattered derived values and handlers that make simple behavior feel harder to follow than it should.

## Solution

Refactor `TrackSelect` so the component is mostly composition and rendering. Move the stateful control flow into one small hook with a narrow surface area, and keep expensive or bulky transformations in a few small pure helpers. Simplify runtime config handling so it is obvious how folder defaults and temporary overrides interact. Keep submit behavior pure and separate from UI code.

## Expected Behavior

- `TrackSelect` remains functionally the same from the user's perspective.
- Opening the modal still derives draft selection from the current browser tracks.
- Changing selections in the modal stays local until submit.
- Submitting still only adds newly selected managed tracks and removes deselected managed tracks.
- Existing managed tracks that stay selected are preserved as-is.
- Reset still restores the draft selection from the current browser state.
- Clear still clears the current folder or all folders depending on the current view.
- Folder-specific toolbar controls still work, but the path from toolbar interaction to active grid config is easier to follow.
- The top-level component reads top-to-bottom as layout plus event wiring, not as a mixed state machine.

## Implementation Decisions

- Introduce one small `useTrackSelectState` hook as the main refactor seam.
- Keep `TrackSelect` responsible for rendering the dialog, layout, and child components.
- The hook owns:
- current view
- active folder id
- draft selection state
- dialog open state
- active runtime config state
- clear, reset, and submit handlers
- Keep managed-track submit logic in pure helpers rather than in the component or hook.
- Keep tree-building in pure helpers so the JSX does not contain data-shaping logic.
- Simplify runtime config state from a generic mutable per-folder map toward a clearer model centered on active folder defaults plus temporary overrides.
- Preserve the current `ToolbarExtras` capability, but simplify the update path so callers do not need to know about config merging details.
- Remove low-value memoization and callback wrapping where it hurts readability more than it helps.
- Prefer a small number of well-named state transitions over many tiny clone, mutate, apply flows repeated inline.
- Avoid over-abstracting into many files or many tiny hooks; the goal is fewer moving parts, not more.

## Testing Approach

- Keep coverage for managed-track submit behavior to ensure the refactor does not regress add, remove, and preserve semantics.
- Add focused tests around the extracted state logic so selection updates, reset, and clear behavior are easy to verify without rendering the full dialog.
- Verify folder navigation behavior, especially switching between folder list and folder detail views.
- Verify runtime config updates still affect the active folder grid as expected.
- Keep at least one integration-style test around the component boundary to confirm the rendered flow still wires state, dialogs, and submit behavior correctly.
- Favor tests that validate observable behavior and state transitions over tests that mirror implementation details.

## Out of Scope

- Redesigning the visual UI of the modal.
- Changing the managed track selection semantics introduced by the recent submit simplification.
- Reordering tracks from the modal.
- Reworking folder definitions or data sources beyond what is needed to simplify `TrackSelect`.
- Broad cleanup of unrelated `TrackSelect` child components unless they directly block this refactor.
