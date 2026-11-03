# Sessions

A session is a saved browsing setup for one assembly. Account-owned persistence is implemented in `apps/web`. [MVP scope](mvp.md) owns product requirements; guest restoration and session copying are planned, not implied by current code.

## Planned product behavior

The open session is app-wide context within a browser tab. Session-aware UI uses it as the default target. Navigation should preserve the active session and its authorized MCP connection; the agent-off setting still wins. Actions on inactive sessions must be explicit.

Guests get one session restored in the same browser, with work preserved on sign-in (storage mechanism open). Signed-in sessions support cross-device restoration. “Save a copy” duplicates setup into an independent session. Saved regions use highlights. Chats are ephemeral. History/undo is outside the MVP.

## What is saved

Assembly (fixed for the session lifetime), persistent browser configuration (region, highlights, settings), track configurations/order/pins, and metadata (id, owner, name, times, revision, save id). Runtime modules, fetched data, loading flags, and connections are not part of a portable snapshot.

`snapshot` / `restore` are the boundary between serializable data and live stores. Schemas and types live with the session feature in code.

## Operations and autosave invariants

A session owner exposes complete operations (open, switch, save, delete) so UI does not reconstruct write/cancel/store-replacement ordering. The server derives identity; the client does not choose the acting user. Updates are conditional on revision and save id so lost replies can retry safely and concurrent writers conflict instead of silently interleaving.

Autosave debounces, saves one snapshot at a time, and must not treat an older ack as covering newer edits. Network failure does not prove a write failed; the same logical write is retried until applied or rejected. `CONFLICT` means another tab saved first: stop autosave, keep edits, let the user save over or discard. Durable offline storage, crash recovery, and merge are out of scope.

Failure UX and route details: `apps/web/README.md`. Current gaps: [limitations](limitations.md).
