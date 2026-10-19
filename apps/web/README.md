# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, user-owned saved sessions in PostgreSQL, the generic workspace layout, and rewrites to the optional Node.js MCP server in `apps/server`. Clerk identifies users in production; local development uses mock users.

The [app docs](docs/README.md) cover [architecture and data flow](docs/02-guides/dataFlow.md), adding routes, panel behavior, and styling. Terms are defined in the [app glossary](glossary.md).

## Run locally

Use Node.js 24 or newer. Install dependencies from the repository root, start PostgreSQL with Docker, and apply the migrations:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm web db:start
pnpm web db:migrate
pnpm dev
```

Open `http://localhost:3000/browser`. With no session open, the browser asks you to open or create one. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps the providers, the open session, and its stores mounted during navigation.

`pnpm dev:web` starts only Next.js. Sessions load and save without the MCP server. `pnpm dev:server` starts only the MCP server. Both bind to loopback.

Next.js rewrites `/mcp` and each tab's command stream, `/rpc/:id`, to the MCP server at `http://127.0.0.1:3001`. Set `GB_SERVER_URL` to use another address; rewrites are fixed when Next.js starts in development and when it builds for production. The `/api/sessions` routes are this app's own.

## Sessions

A session is a named, saved browser setup for one assembly, owned by one user. Its URL is `/browser/<uuid>`, using the ID the database generated. Opening that URL, following a link, or moving through history all open the session the same way.

The Sessions panel lists the signed-in user's sessions by name and marks the open one. Under the list, enter a name and choose an assembly to create a session; only hg38 is supported now. It starts at the assembly's default region with the coordinate ruler, GENCODE 50 basic genes in merged display, and human cCREs. The field at the top of the panel renames the open session. The delete icon removes a session.

A snapshot saves the region, browser settings, highlights, selection settings, ordered track configurations with their source ownership, and pinned track IDs. Runtime loading state, fetched data, and registered modules stay in the tab. Every first-party track module is registered so saved tracks of any of those types restore.

Edits apply immediately. About 200 ms after an edit, the tab saves the whole snapshot and name. It sends one write at a time and saves edits made during a write with the next one. **Saved**, at the top left of the browser center panel, appears only once the newest edits are acknowledged. Failed writes retry with backoff, from one to ten seconds, while you keep working. Edits the routes refuse, such as a session over 1 MB, are not sent again; the tab reports them and saves after a further edit. A session deleted elsewhere is never recreated. Its edits stay in the tab, unsaved, until **Close without saving** discards them.

Opening another session first saves every edit to the open one, including edits made while the next session loads. If that save fails, or the next session cannot be loaded, the open session stays with its edits and an error, and the URL returns to it. Deleting the open session waits for a write in progress, then deletes it, and the browser shows no session. If deletion fails, the session stays open and keeps saving. A session that fails to load is never overwritten; the browser offers to try again.

Closing or reloading the tab while edits are unsaved, including edits that cannot be saved, asks for confirmation. The tab does not try to save during unload. Several tabs may edit one session, and the last write wins.

The saved-session list refreshes when the window regains focus. Visiting Settings or Collections keeps the open session and its stores.

### Accounts

Without `GB_IDENTITY`, the app uses Clerk. `proxy.ts` runs `clerkMiddleware()` on every route except static files, the root layout renders `ClerkProvider`, and `/sign-in` shows Clerk's sign-in form. The sidebar's account menu saves and closes the current session before opening Clerk's account management or signing out, or the sidebar shows a sign-in link when signed out. It replaces Clerk's user button, whose sign-out cannot wait for saving. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` at runtime. `CLERK_JWT_KEY`, the instance's PEM public key, lets Clerk verify session tokens without fetching its keys. Without keys in development, Clerk starts its keyless mode, which creates a temporary Clerk application. The root layout renders on each request, so builds need no Clerk keys. Sign-in through a real Clerk instance has not been tested yet.

`GB_IDENTITY=mock` makes requests act as local mock users, with no Clerk keys or Clerk service. Requests act as `mock_user_1` by default. The sidebar's person button switches to `mock_user_2` or to signed out: it closes the open session, then sets the `gb_mock_user` cookie and reloads. `/sign-in` returns 404 in this mode. Mock identity is refused when `NODE_ENV` is `production`, which includes `next start`; every request then fails with that error.

Signing out or switching users from the sidebar first saves and closes the open session. If saving fails, a dialog offers to stay with the edits, try again, or discard them; the account changes only after that choice. An account change made elsewhere, such as signing out in another tab, discards the tab's open session, list, and pending writes, unsaved edits included. They cannot be saved without the old account's credentials, and nothing from one account reaches another.

The dev and start scripts bind to `localhost`. With `--hostname 127.0.0.1`, Next.js gives the proxy `localhost` URLs, and every request that passes through Clerk fails.

### Session routes

The browser calls these route handlers. Each derives the user from the request and never accepts an owner.

| Route                      | Result                                                  |
| -------------------------- | ------------------------------------------------------- |
| `GET /api/sessions`        | The user's sessions, without snapshots, sorted by name. |
| `POST /api/sessions`       | Create a session from `{ name, snapshot }`.             |
| `GET /api/sessions/:id`    | The session with its snapshot.                          |
| `PUT /api/sessions/:id`    | Replace its name and snapshot. Never recreates it.      |
| `DELETE /api/sessions/:id` | Delete it. Responds 204.                                |

Bodies are limited to 1 MB. Rejections are `{ code, message }` with status 400 `INVALID_INPUT`, 401 `UNAUTHENTICATED`, 404 `NOT_FOUND` (including another user's session), or 409 `ASSEMBLY_CHANGED`. Other failures return 500 without detail and log the error on the server.

Server code can use the same operations directly. `server/composition.ts` exposes `getSessions()`, which only server code may import:

```ts
const sessions = getSessions();
const saved = await sessions.create({ name: "Promoter scan", snapshot });
await sessions.update(saved.id, { name: saved.name, snapshot: edited });
```

### Database

`compose.yaml` runs PostgreSQL on `127.0.0.1:5432` with a named volume, matching `DATABASE_URL` in the example file. `pnpm web db:stop` stops it. Any PostgreSQL server works if you change `DATABASE_URL`. After changing `server/sessions/table.ts`, run `pnpm web db:generate` and commit the new files in `drizzle/`.

The database tests need a PostgreSQL server. Set `GB_TEST_DATABASE_URL` to a connection that may create databases, such as `postgres://genomebrowser:genomebrowser@127.0.0.1:5432/postgres` with the compose database. Each run creates and drops its own database. Without the variable, the tests are skipped locally and fail in CI, which runs a PostgreSQL service.

In production, set `DATABASE_URL` to the Google Cloud SQL instance. The `pg` driver accepts standard PostgreSQL URLs, including SSL options such as `sslmode` and `sslrootcert` for a public IP, or a Unix socket host such as `/cloudsql/<project>:<region>:<instance>` when the Cloud SQL Auth Proxy provides one. Run `pnpm web db:migrate` against that database before deploying code that needs a new migration. The server reads credentials only when an operation first runs, so builds do not need them.

### Sessions saved by the old server

Before this app saved sessions, the MCP server kept them in SQLite by URL name, with no owner. Neither the browser nor the server reads that file now, and nothing claims those sessions automatically. An administrator can copy them to one user:

```sh
pnpm web sessions:import-sqlite --sqlite ../server/data/browser.sqlite --owner <user ID>
```

Each copy gets a new UUID and keeps the old ID as its name. Add `--session <old ID>` once per session to copy only some. The script opens the SQLite file read-only. It skips sessions already copied unchanged for that owner and lists any snapshot that fails validation. The owner is a Clerk user ID, or a mock user ID locally.

## Control a browser tab

Agents control the browser through MCP. Each command is an MCP tool that takes a `sessionId` and returns its own result once the tab applies it; `set_region` returns the region shown and whether it was clamped. Only the first tab to open a session receives its commands. Later tabs keep retrying and take over when that tab closes.

Remote control is optional and off by default. Turn it on under **Remote control** in Settings. While on, the tab connects the open session once it has loaded. The connection closes as soon as that session is replaced, closed, or deleted, the account changes, or its edits can no longer be saved, such as after it was deleted elsewhere. The tab then connects the next session it opens. A command that arrives after its session was replaced fails with `SESSION_CLOSED` and changes nothing. Turning remote control off closes the stream; MCP calls for the session then fail. A stopped or unreachable MCP server only leaves the Agent panel reconnecting; sessions still load and save.

Connect an MCP client to `http://localhost:3000/mcp`, or to `http://127.0.0.1:3001/mcp` to skip Next.js. For example, with Claude Code:

```sh
claude mcp add --transport http genome-browser http://localhost:3000/mcp
```

Then ask the agent to call `set_region` with the session ID from the URL, which the Agent panel also shows, and a zero-based, half-open region such as `{"chromosome":"chr1","start":100000,"end":200000}`. Success means the store accepted the region; it does not mean track data has finished rendering.

A tool call fails with an MCP validation error for invalid parameters, `NOT_CONNECTED` when no tab has the session open with remote control on, `TIMEOUT` when the tab does not reply within five seconds, and the store's own code, such as `UNKNOWN_CHROMOSOME`, when the tab rejects the command. A timeout or disconnect can occur after the tab changes its state but before its reply reaches the agent. Do not assume a failed call left the region unchanged.

The tab opens an SSE stream at `/rpc/:id`, which Next.js forwards to the MCP server. The MCP server has no database and does not check session ownership; anyone who can reach it and knows a session ID can control a connected tab. Commands carry a unique `commandId` and `expiresAt`, and the tab posts its reply to the same path. Commands are not replayed after reconnection. The server tracks open tabs and pending commands in memory.

## Change the product

The shared `app/(workspace)/layout.tsx` resolves the account, then wraps route children in `AppProviders` and `Workspace`. `AppProviders` mounts one `SessionProvider` per account, which owns saved sessions and the open session for the workspace's lifetime. Components read it with `useSession`, selecting one value at a time:

```tsx
const sessions = useSession((session) => session.sessions);
const open = useSession((session) => session.open);
void open(id); // Saves the open session first; reports failures in `error`.
```

`open`, `create`, `rename`, `remove`, and `close` are complete operations; `close` saves or discards the open session before an account change. They save, request, replace stores, and update the URL themselves, so panels only call them. The session feature lives in `sessions/`: `session.ts` owns the lifecycle, `autosave.ts` the Effect save worker, and `transport.ts` the requests to the session routes. `assemblies/assemblies.ts` lists supported assemblies and creates their default stores. `browser/snapshot.ts` converts stores to and from snapshots. `commands/` holds the optional remote control: `RemoteControl.tsx` attaches `remoteControl.ts` to the open session, and `commands.ts` implements each command. The browser page's views and panels belong in `app/(workspace)/browser/`.

Generic layout, panels, and theme live in `components/workspace/` and must not import domain code. `Workspace` owns the lifetime of panel state defined in `panels/panelState.tsx`. The `frame/` group contains the shared header, sidebar, and title rows. Panel sizing and collapse behavior belong in `panels/`, where `SidePanel` uses `Resizable`; transition enablement lives in `useTransitionEnabled.ts`.

To add a product page:

1. Create `app/(workspace)/<name>/page.tsx` as a normal Next.js server page. Render `WorkspacePage` with the page's title, optional subtitle and side panels, and center children. Colocate domain components with the route and mark interactive components as client components.
2. Add a link to `app/(workspace)/navigation.tsx` with `href`, `label`, `icon`, and optional `placement: "bottom"`. Navigation contains no panel definitions or page components.
3. Keep the existing shared layout so navigation preserves the open session and panel state. Route-local component state may reset when navigating away. Refreshing restores the session in the URL from its last save.

There is no central page registry or page export step. See [Pages and panels](docs/02-guides/pages.md) for a route example.

A command's contract lives in `@weng-lab/agent-commands`, and its implementation in `commands/commands.ts`. The MCP server needs no change. Follow [Add a command](../../packages/agent-commands/README.md#add-a-command).

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/02-contributing/testing.md). The [app docs](docs/README.md) describe workspace components and route composition.

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
pnpm exec turbo run build --filter=@weng-lab/browser-server
pnpm --filter @weng-lab/browser-server start
```

Run Next.js and, for agent control, the MCP server as separate processes. Set `GB_SERVER_URL` before `next build` if the server is not at `http://127.0.0.1:3001`. For an HPC deployment reached through an SSH tunnel, forwarding web port 3000 is sufficient because the rewrites reach the server on loopback. Set `GB_ALLOWED_ORIGINS` if the browser uses a different web origin.

For Vercel, set the project's Root Directory to `apps/web` and enable access to files outside that directory so workspace dependencies are included. The app's `vercel.json` selects Next.js and builds through Turbo from the repository root, which builds workspace dependencies before the app. Sessions need only Next.js and PostgreSQL; MCP needs the separate server.

The MCP server has no authentication and rejects non-loopback hosts. Add authentication and session authorization for tab streams and MCP before deploying it beyond loopback. It needs a persistent process for long-lived SSE streams and pending commands.
