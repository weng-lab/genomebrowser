# Slice 2: TrackSelect Startup From Managed IDs

## Dependencies

Slice 1: Folder-Owned Track Creation.

## Description

Teach `TrackSelect` to start from managed track IDs instead of consumer-owned submit plumbing. On startup, it should restore managed IDs from session storage when available, otherwise fall back to a provided default managed ID list, and then recreate the corresponding folder-backed tracks into `trackStore`.

## Expected Behaviors Addressed

- A site can render `TrackSelect` by passing `trackStore`, `assembly`, folders, a session key, and default managed IDs.
- If managed IDs exist in session storage, `TrackSelect` restores from that state.
- If no session state exists, `TrackSelect` uses the provided default managed IDs.
- `TrackSelect` recreates the corresponding folder-backed tracks into `trackStore`.

## Acceptance Criteria

- [ ] `TrackSelect` accepts browser-facing startup props for managed IDs and session storage.
- [ ] Session-managed IDs take precedence over prop-provided default managed IDs.
- [ ] Managed tracks are recreated into `trackStore` from the chosen startup ID source.

## QA

1. Clear session storage for the UI test harness and load the page.
2. Confirm the default managed IDs are used to seed tracks into the browser.
3. Save a different managed selection in session storage and reload.
4. Confirm the saved managed IDs win over the default list.
5. Run the `packages/ui` vitest suite covering startup precedence logic.

---

_Appended after execution._

## Completion

What was built. Key decisions made during implementation. Any deviations from the slice plan and why. Files created or modified. Anything the next slice should be aware of.
