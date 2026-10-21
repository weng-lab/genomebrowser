# Sessions

A session is a saved browsing setup for one assembly. The saved data and session operations below are implemented in `apps/web`.

## Saved data

- Assembly, fixed at creation for the session's lifetime.
- Persistent browser configuration, including the viewport and regions of interest stored as highlights with per-entry visibility.
- Track configurations, display order, and pinned tracks.
- Metadata: stable session ID, Clerk owner ID, name, creation time, and update time.

Assembly already belongs to browser configuration. Keep one authoritative value rather than duplicating it at the session root. Another assembly requires a new session. Enforce this on updates as well as in the UI.

The browser-safe snapshot schema lives in `apps/web/features/sessions/snapshot.ts` and uses Zod and the shared region schema from `@weng-lab/contracts`. It accepts any assembly ID; the web app decides which assemblies it supports, and restoring into stores for another assembly fails. Command contracts use the same shared region schema. Start from this `SessionSnapshot` schema and configuration types. Infer types from authoritative schemas and align database and application shapes. Avoid separate row, DTO, model, and view representations unless their data actually differs.

Exclude transient highlights, such as ruler hover feedback, from saved configuration.

Keep `snapshot()` and `restore()` as the boundary between serializable data and live stores. Actions, registered modules, fetched data, loading flags, and connections are runtime details. Do not copy live store state into another session store.

## Session operations

A workspace-lived session module owns initialization, metadata, restoration, autosave, switching, and deletion. `useSession` is the React interface, with focused subscriptions and complete operations. Panels should not coordinate flushes, request cancellation, list refreshes, store replacement, or fallback navigation.

Next.js derives ownership from the server-side identity capability, backed by Clerk in production or mock identity locally, and validates each operation. Create and update are distinct: an autosave must not recreate a deleted session. The client does not choose the acting user.

## Background autosave

Edits update the browser immediately. Observe changes to persisted configuration and editable metadata, debounce briefly, and save one snapshot at a time. Retain the newest edits during a write and save again afterward if needed. Acknowledging an older snapshot must not mark newer edits saved.

Effect owns the worker lifetime, delays, and retries. Failed writes retain unsaved state and retry without blocking browsing. Expose save status to the UI. Start autosave after restoration succeeds; never overwrite a failed load with defaults.

The app saves whole snapshots. Switching saves outstanding edits before replacing the stores; deletion waits for an outstanding write. Tab close requests a warning for unsaved edits. See the [session guide](../../apps/web/README.md#sessions) for failure behavior and [limitations](limitations.md) for current constraints.

## Future sharing

Track collection JSON shares track configurations. Session JSON should reuse the versioned snapshot to restore the complete browsing setup, including assembly. Export portable metadata such as the name, not account ownership or database identity. A future import should create a new session owned by the importing user.

Keep the model ready for this without implementing sharing yet.

[Back to app direction](README.md)
