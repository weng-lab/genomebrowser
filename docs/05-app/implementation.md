# Implementation order

Use this as the starting context for bounded implementation threads. Read [app direction](README.md), [sessions](sessions.md), and [feature boundaries](features.md) first. Inspect the current code and working-tree changes before choosing a slice; this plan does not mean the refactor has shipped.

## Work in order

1. **Settle the model and seams.** Inspect existing assembly definitions, track modules, snapshot conversion, and callers. Define session metadata and small injected capabilities using existing types. Choose the PostgreSQL driver, connection setup, and migration strategy for Google Cloud SQL and local PostgreSQL.
2. **Establish Next.js persistence.** Compose Clerk identity and Drizzle PostgreSQL access server-side, with local mock identity and local PostgreSQL using the same schema and migrations. Add the session table, migrations, and owner-checked create, list, load, update, and delete operations. Enforce immutable assembly and distinguish creation from updating.
3. **Move session access.** Replace the standalone server's persistence endpoints and proxy configuration. Decide explicitly how existing snapshots gain ownership or are migrated; do not discard saved data implicitly.
4. **Consolidate the session lifecycle.** Reuse the browser and track stores. Implement the session interface and Effect autosave worker, then move switching and deletion coordination out of panels. Cover route/history changes as well as panel navigation.
5. **Separate MCP.** Remove database dependencies from the standalone server and separate shared command contracts. Start with one tool that sets the browser region. Make the connection an optional attachment to the active session, with stale commands unable to affect its replacement. Keep command dispatch extensible to other app features without making every command depend on browser state.
6. **Remove superseded wiring.** Delete replaced controllers, contexts, helpers, dependencies, and documentation claims. Avoid compatibility wrappers. Update current implementation docs as each slice lands.

## Progress

Steps 1 to 5 have landed in three slices.

- `packages/session-snapshot` holds the snapshot schema. `browser.assembly` accepts any assembly ID; restoring into a store for another assembly fails.
- `apps/web/server/sessions/` owns the `sessions` table and `createSessions({ db, identity })`. Operations derive the owner from identity on every call, validate input, report other users' sessions as not found, refuse to recreate deleted sessions, and check the stored assembly inside the `UPDATE` statement. Migrations live in `apps/web/drizzle/`.
- `apps/web/server/identity.ts` selects Clerk or explicitly enabled mock users and refuses mock identity in production. A test sends requests through the real proxy and Clerk's `auth()` with locally signed tokens.
- Route handlers under `apps/web/app/api/sessions/` expose those operations with a 1 MB body limit and coded errors; other failures return 500 without detail. The `/api/*` rewrite is gone. Only `/mcp` and `/rpc/:id` still go to the MCP server.
- `apps/web/sessions/` owns the client lifecycle. One store per account, mounted by the workspace layout, holds the session list, the open session's stores, save status, and complete `open`, `create`, `rename`, `remove`, and `close` operations; components read it through `useSession`. Composition injects the HTTP transport, store construction from `assemblies/`, and navigation. Effect runs requests, the autosave worker, debounce, and retries; interruption aborts a request and its response body.
- URLs carry the session UUID. Links, typed URLs, and history all call `open`, which saves the open session first and keeps it, with its edits, when saving or loading fails. `/browser` without an ID shows an empty state. Deleting the open session waits for an outstanding write.
- Autosave keeps unsaved edits dirty whatever the failure. Refused input, such as a session over 1 MB, waits for a further edit; `NOT_FOUND` ends saving, and switching then fails until the user discards the edits.
- The sidebar's account menu, for Clerk or mock users, signs out or switches only after `close` saves and closes the open session. If saving fails, it offers to stay, retry, or discard. The session provider is keyed by user, so an account change made elsewhere stops the previous user's requests and saving.
- `pnpm web sessions:import-sqlite` copies old SQLite sessions to one named owner with new UUIDs, keeping the old ID as the name. It never runs automatically and leaves the SQLite file unchanged.
- `apps/server` has no database, persistence routes, or session list. It starts without credentials and serves `/mcp`, `/health`, and each tab's stream at `/rpc/:id`, keeping the local host, origin, body-size, and timeout checks. The session ID only routes calls.
- `packages/agent-commands` holds browser-safe command contracts: tool name, description, parameter schema, and result schema, plus the tab message schemas. The MCP server makes each contract a tool and checks the tab's result against it. The web app implements each contract in `commands/commands.ts` against `CommandCapabilities`, which today holds the open session's stores. A command that needs other app capabilities adds them there. `set_region` returns the region shown and whether it was clamped.
- The active session has a `signal` that aborts synchronously when the session is replaced, removed, closed, or stopped, and when its edits can no longer be saved. Remote control closes its stream on that signal and answers a late command with `SESSION_CLOSED` without running it, so no command succeeds on stores whose edits will not be saved. Deletion aborts the attachment before sending DELETE; if deletion fails, the same stores keep their edits and receive a new signal. Refused edits that a further edit can fix do not end it.

Known limitations, with their impact:

- Sign-in against a real Clerk instance is untested; no credentials were available. Account switching is tested with mock users, and sign-out with Clerk's hooks replaced. Smoke-test a Clerk development instance before relying on it.
- An account change made outside the account menu, such as signing out in another tab or the Clerk session ending, discards unsaved edits. They cannot be saved with the new credentials, and keeping them would show them to the new account. Clerk's multi-session switching is not offered. Closing the tab with unsaved edits asks for confirmation but does not save.
- Several tabs may edit one session; the last write wins.
- While another session opens, the browser keeps showing the open one under the new URL until restoration finishes.
- Only hg38 can be created.
- Merged gene tracks store their data-dependent height in the track configuration. A new session therefore saves once shortly after its first render without a user edit. This is harmless but means saved height follows loaded data.

- MCP has no authentication or authorization. Anyone who can reach the server and knows a session ID can control a connected tab, so it stays on loopback. Design both before cloud deployment, along with hosting that keeps SSE connections open.
- After the session's saving ends, such as when it was deleted elsewhere, the Agent panel says agents cannot control it. Remote control reconnects only when another session opens.
- A timed-out or disconnected command may still have changed the tab's stores before its reply arrived.

Step 6 is next: remove any remaining superseded wiring and documentation claims.

Production pool sizing for serverless functions on Cloud SQL is untested. The pool uses `pg` defaults.

The web server binds to `localhost` for Clerk request handling. On systems where this resolves to `::1`, IPv4 clients and SSH forwarding to `127.0.0.1` may not connect. Use the documented localhost URL and verify the listening address before configuring a tunnel.

## Slice workflow

Keep the refactor in one draft PR on `architecture-refactor`. Opus 5.5 Medium implements each bounded slice, then Sol 6.1 Medium reviews correctness, code cleanliness, and module boundaries. Return findings to Opus and request a second Sol review when needed. Limit each slice to two review rounds. Record real unresolved limitations in this directory, with their impact and follow-up, before committing the slice. Keep one implementation commit per settled slice.

Implementers run verification; reviewers inspect code and existing evidence. Complete each slice before beginning the next. The original uncommitted Effect implementation is excluded; build from the committed application and these architecture decisions.

## Verification

Preserve useful behavioral tests. Exercise local PostgreSQL migrations and ownership checks with multiple mock users. Cover immutable assembly, restoration failures, edits during saves, retry recovery, switching, and deletion during a write. Measure affected render budgets and run repository checks.

Demonstrate opening, editing, saving, reloading, switching, and deleting sessions with MCP stopped. Then connect MCP, edit through a command, disconnect, and continue browsing.

## Decisions and scope

Settled in the second slice: route handlers as the transport, explicit per-owner import of SQLite sessions, a confirmation prompt for unsaved edits on tab close, and last-write-wins across tabs. MCP authentication and connection authorization need design before cloud deployment.

Defer sharing UI, user settings, incremental writes, and advanced conflict handling. Keep initial behavior simple without hiding unsaved data or silently losing edits.

[Drizzle #356](https://github.com/weng-lab/genomebrowser/issues/356) and [Effect #355](https://github.com/weng-lab/genomebrowser/issues/355) describe earlier implementation boundaries. Update their scope before using them as implementation briefs; the direction here takes precedence.

[Back to app direction](README.md)
