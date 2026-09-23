# Session and custom-track persistence

Current behavior of saved sessions, custom tracks, and database access. For planned guest storage and collection organization, see the [design notes](sessions-and-persistence.md).

## Saved sessions

On `/dashboard`, select **Create a session**, enter a name, and choose an assembly. Creation saves a session with the reference ruler and default gene track pinned at the top, then opens `/browser/[sessionId]`. The dashboard lists only the signed-in user's sessions and supports opening and deleting them. Accounts can have up to five sessions, including when requests create sessions concurrently.

The navbar shows the selected session's title, and its Browser link returns to that session from other pages. The tab remembers only the session ID, title, and owner in `sessionStorage`; browser and track state still load from PostgreSQL when opening the session. Selection is scoped to the signed-in account. Opening guest mode or deleting the selected session clears it. If a remembered session is no longer available to the signed-in user, opening it redirects to `/browser` and clears the selection.

Browser and track store changes automatically save the visible region, highlights, browser settings, and ordered track instances. Highlight colors, opacity, and style persist. Selection mode does not persist and starts as pan when reopening a session. The browser has no manual save button or session-name editor; names are chosen during creation. Guest tab storage remains unimplemented.

Autosave groups store notifications into 350 ms batches, captures a detached snapshot, and allows one write at a time. Edits made during a request are saved next with the returned revision. Unchanged persisted snapshots do not cause writes. Serialization and requests happen outside store notification handlers, and saving does not block browser interaction.

The database snapshot initializes the client stores when the session page loads. After that, data flows from the stores to `PUT /api/sessions/[sessionId]`; responses contain only save metadata or an error. Route-handler invalidation marks the dashboard and session page stale for future visits without refreshing the active page or hydrating the stores again.

The server derives ownership from Clerk for every read and mutation. The `sessions` table has a composite primary key of `owner_id` and `id`, plus a name, revision, timestamps, snapshot version, `browser_state` JSONB, and `track_state` JSONB. Both states update in one transaction. Store actions, module implementations, interaction callbacks, and fetched data stay out of storage. Server validation checks snapshot structure, registered assemblies, track IDs, and module configuration using the generated track JSON schema. Opening a session creates independent stores and restores application callbacks.

Updates must match the saved revision. A stale tab receives a conflict error instead of overwriting a newer save. Reloading discards local unsaved edits and loads the stored revision. Transient failures retry with increasing delays up to ten seconds while mounted. Conflicts, invalid snapshots, and authorization failures display an error and do not overwrite local state or retry indefinitely. Pending changes flush when the page is hidden or the session unmounts. Small requests use browser keepalive, but closing the browser before saving finishes is not guaranteed to preserve edits, especially large snapshots or requests queued behind an in-flight save. Routine saves run silently; only save failures display an alert. Session assembly is immutable.

## Custom tracks and collections

The dashboard has horizontal Sessions and Custom tracks / collections tabs. Each account has a custom collection per assembly. In the browser, **Add track** opens a scrollable list of track types with descriptions and schematic example previews. Selecting a type opens that module's settings in the creation dialog. URL fields use **Set** to confirm source changes. The draft stays separate from the browser until submission.

**Add track** saves the configuration to the signed-in account, then inserts a user-owned track at the top of the browser below pinned tracks. Validation and storage failures keep the draft open. Cancel discards it. Saved custom tracks appear in the dashboard and under **Saved custom tracks** in the add-track dialog, filtered to the current assembly. Adding one to another session creates an independent instance; later session edits do not change the collection entry.

Custom tracks require account and database configuration. Entries live in the `custom_tracks` table independently of sessions, with ownership derived from Clerk on every read and write. Creation retries with the same ID return the original entry. Source URLs must use HTTP or HTTPS; no file uploads are supported. CAVE is available only for hg38. Named collections, collection editing, and collection deletion remain unimplemented.

## Database connections

Drizzle defines tables in `db/schema.ts` and tracks SQL migrations in `db/migrations/`. The `pg` client initializes one pool per server process with at most five connections. Initialization is shared across concurrent requests and retried after a failure. Builds do not connect to the database or apply migrations.

For local development, `DATABASE_URL` selects the database. Setting `INSTANCE_CONNECTION_NAME` takes precedence and uses Google's Cloud SQL connector over the instance's public IP. On Vercel, it uses OIDC federation; outside Vercel, it uses Google Application Default Credentials. The connector handles encrypted connections and Cloud SQL authorization. PostgreSQL still authenticates with `DB_USER` and `DB_PASSWORD`.

If neither connection setting is present, storage is unavailable. Incomplete Cloud SQL settings, connection failures, and query failures produce load or save errors. Vercel's connection lifecycle helper manages idle pool connections, and the Google credential supplier reads a current OIDC token when credentials need refreshing. Concurrent server processes each have their own pool.

Follow [local development](localDevelopment.md) for database setup, migrations, and tests, or [Vercel deployment](vercel-gcp.md) for the hosted connector. Return to [standalone docs](README.md).
