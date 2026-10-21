# Sessions

A session is a saved browsing setup for one assembly. The saved data and session operations below are implemented in `apps/web`.

## Saved data

- Assembly, fixed at creation for the session's lifetime.
- Persistent browser configuration, including region and highlights.
- Track configurations, display order, and pinned tracks.
- Metadata: stable session ID, Clerk owner ID, name, creation time, update time, and revision.
- The save ID of the update that produced the current revision.

Assembly already belongs to browser configuration. Keep one authoritative value rather than duplicating it at the session root. Another assembly requires a new session. Enforce this on updates as well as in the UI.

The browser-safe snapshot schema lives in `apps/web/features/sessions/snapshot.ts` and uses Zod and the shared region schema from `@weng-lab/contracts`. It accepts any assembly ID; the web app decides which assemblies it supports, and restoring into stores for another assembly fails. Command contracts use the same shared region schema. Start from this `SessionSnapshot` schema and configuration types. Infer types from authoritative schemas and align database and application shapes. Avoid separate row, DTO, model, and view representations unless their data actually differs.

Keep `snapshot()` and `restore()` as the boundary between serializable data and live stores. Actions, registered modules, fetched data, loading flags, and connections are runtime details. Do not copy live store state into another session store.

## Session operations

A workspace-lived session module owns initialization, metadata, restoration, autosave, switching, and deletion. `useSession` is the React interface, with focused subscriptions and complete operations. Panels should not coordinate flushes, request cancellation, list refreshes, store replacement, or fallback navigation.

Next.js derives ownership from the server-side identity capability, backed by Clerk in production or mock identity locally, and validates each operation. Create and update are distinct: an autosave must not recreate a deleted session. The client does not choose the acting user.

Each update names the revision its edits were based on and a client-chosen save ID. The server checks ownership, assembly, and revision, writes, and records the save ID in one conditional statement, so concurrent updates cannot interleave. An update at a stale revision fails with `CONFLICT`, unless its save ID produced the current revision; that retry returns the recorded result without applying the update again. Only the latest save ID is kept. A tab sends one logical write at a time, so the only write it can retry is its newest one. If another writer has saved since, the retry is a conflict rather than a success.

## Background autosave

Edits update the browser immediately. Observe changes to persisted configuration and editable metadata, debounce briefly, and save one snapshot at a time. Retain the newest edits during a write and save again afterward if needed. Acknowledging an older snapshot must not mark newer edits saved.

Effect owns the worker lifetime, delays, and retries. Failed writes retain unsaved state and retry without blocking browsing. Expose save status to the UI. Start autosave after restoration succeeds; never overwrite a failed load with defaults.

### Save guarantees

The worker tracks three things: the snapshot the server acknowledged, with its revision; at most one unsettled write; and the newest edits. A logical write is fixed when first sent: its snapshot, base revision, and save ID never change.

- A network failure or server error does not prove that a write failed. The write stays unsettled and is sent again unchanged until the server applies or rejects it. Newer edits wait behind it, even edits that revert it, so a write whose response was lost cannot reappear after a revert is reported saved.
- Only a response acknowledges a write, and only for the snapshot it sent. The next write is based on the revision that response returned.
- Any other rejection proves the write was not applied, so it is dropped. Refused input waits for a further edit; `NOT_FOUND` and lost credentials end saving.
- Edits stay unsaved, and the tab warns before closing, until acknowledged. Switching, deleting, and account changes go through the session owner, which saves first or discards explicitly.

### Conflicts

A `CONFLICT` means another tab or window saved the session after this tab's edits were based on it. The tab stops saving, shows the conflict, and keeps the edits. It does not reload the other version or merge. The user resolves the conflict in one of two ways: **Save over it** reads the current revision and saves the edits on top, and **Close without saving** discards them, abandoning a save over it still in progress. Until then, switching sessions and changing accounts behave as for any edits that cannot be saved. Work on the stores can continue, and agent commands stay connected, because the edits can still be saved.

The app saves whole snapshots. Switching saves outstanding edits before replacing the stores; deletion waits for an outstanding write. Tab close requests a warning for unsaved edits. Durable offline storage, crash recovery, and collaborative merging are out of scope. See the [session guide](../../apps/web/README.md#sessions) for failure behavior and [limitations](limitations.md) for current constraints.

## Future sharing

Track collection JSON shares track configurations. Session JSON should reuse the versioned snapshot to restore the complete browsing setup, including assembly. Export portable metadata such as the name, not account ownership or database identity. A future import should create a new session owned by the importing user.

Keep the model ready for this without implementing sharing yet.

[Back to app direction](README.md)
