# Sessions

The requirements a session implementation must keep. Product scope, including guests, is in the [MVP](mvp.md#sessions-and-guests). A session's assembly is fixed for its lifetime, and its snapshot holds only serializable setup, never live stores, fetched data, or connections.

## Operations and autosave invariants

A session owner exposes complete operations (open, switch, save, delete) so UI does not reconstruct write/cancel/store-replacement ordering. The server derives identity; the client does not choose the acting user. Updates are conditional on revision and save id so lost replies can retry safely and concurrent writers conflict instead of silently interleaving.

Autosave debounces, saves one snapshot at a time, and must not treat an older ack as covering newer edits. Network failure does not prove a write failed; the same logical write is retried until applied or rejected. `CONFLICT` means another tab saved first: stop autosave, keep edits, let the user save over or discard. Durable offline storage, crash recovery, and merge are out of scope.

Current gaps: [limitations](limitations.md).
