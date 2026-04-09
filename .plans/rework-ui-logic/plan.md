# TrackSelect Submit Diff Simplification

## Problem

Submitting the track select modal currently rebuilds managed tracks instead of treating the browser track store as the source of truth and applying only the actual selection changes. That resets user-edited track properties like height even when the user submits without making changes. The current flow also carries ordering state that is not meaningful for this UI and adds complexity that does not help the behavior we want.

## Solution

Keep the browser track store as the single source of truth, derive modal selection from the current store, and on submit compute a simple ID diff between the current managed tracks and the modal draft. Only remove deselected managed tracks and add newly selected managed tracks. Do not recreate tracks that already exist. Do not reorder anything. Simplify the TrackSelect state and helper logic by removing ordering-related state and abstractions that are no longer needed.

## Expected Behavior

- When the modal opens, tracks currently present in the browser are shown as selected if their IDs exist in the managed folder definitions.
- Unknown track IDs already in the store are ignored by the TrackSelect UI.
- When the user changes selections in the modal, those edits remain local until submit.
- When the user clicks Submit without making changes, no existing tracks are recreated or reset.
- When the user deselects a managed track and submits, that track is removed from the browser.
- When the user selects a new managed track and submits, that track is created and appended to the bottom of the browser track list.
- When a managed track stays selected across submit, any user edits on that track such as height remain intact.
- Track selection order in the modal has no effect on browser track order.

## Implementation Decisions

- The browser track store remains the source of truth for current browser state.
- TrackSelect draft state is derived from the current store state when the modal opens or resets.
- Submit logic compares managed IDs currently in the store against managed IDs selected in the modal.
- The submit path only performs add and remove operations.
- Existing managed tracks that remain selected are preserved as-is and must not be recreated.
- Ordering state should be removed entirely from the TrackSelect flow.
- Ordering-specific helper logic should be removed from the managed track utilities.
- The implementation should prefer direct logic over small helper abstractions where the helpers do not materially simplify the code.
- Store mutations should use the track store's normal operations. If batch add or batch remove operations are missing, they should be added in the core store and then used by TrackSelect.

## Testing Approach

- Add unit tests around deriving TrackSelect draft state from the current store while ignoring unknown IDs.
- Add tests that submitting with no selection changes leaves existing managed track objects intact.
- Add tests that deselecting managed tracks removes only those tracks.
- Add tests that selecting new managed tracks appends them to the end of the store.
- Add tests that unmanaged tracks remain untouched during TrackSelect submit.
- Add tests that existing managed tracks preserve edited properties like height across submit.
- Remove or update tests that currently assert ordering behavior or rebuilt managed-track replacement behavior.

## Out of Scope

- Changing how users edit track properties outside the modal.
- Reordering tracks from the TrackSelect modal.
- Preserving or interpreting unknown track IDs inside the TrackSelect UI.
- Broader TrackSelect UI redesign beyond simplifying the state and submit behavior.
- Starting the dev server for manual QA from this session.
