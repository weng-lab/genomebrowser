# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, user-owned saved sessions in PostgreSQL, the generic workspace layout, and the Eve agent in `agent/`, whose commands run in browser tabs. Clerk identifies users locally and in deployments; mock users are optional for offline development.

The [app docs](docs/README.md) cover [architecture and data flow](docs/02-guides/dataFlow.md), adding routes, panel behavior, and styling. Terms are defined in the [app glossary](glossary.md).

## Run locally

Use Node.js 24 or newer. Install dependencies from the repository root, start PostgreSQL and Redis with Docker, and apply the migrations. After copying the environment file, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to the `pk_test_` and `sk_test_` keys from the Clerk development instance used by Preview, before starting the app:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm web db:start
pnpm web db:migrate
pnpm dev
```

Open `http://localhost:3000/browser`. With no session open, the browser asks you to open or create one. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps the providers, the open session, and its stores mounted during navigation.

`pnpm dev` starts Next.js, which starts the Eve agent. Both bind to loopback. Sessions load and save without Redis; agent commands need it.

For a private development proxy such as Tailscale Serve, set `GB_DEV_HOSTS` in `.env.local` to its hostname (without scheme or port), then restart Next.js. This allows the browser to load development scripts and hot reload through that host. Database requests still go through Next.js; PostgreSQL should stay on loopback. For agent chat, also set `GB_AGENT_DEV_ORIGINS` in `.env.local` to the exact private proxy origin (including scheme and port), then restart `pnpm dev`. These settings trust the private proxy's access control and do not enable production authentication.

## Agent chat

The Agent panel uses the [Eve agent](docs/02-guides/agent.md) in `agent/`. Set `AI_GATEWAY_API_KEY` to use Vercel AI Gateway, or sign in with `codex login` for the local fallback. Run `pnpm dev`, open a session, and open the Agent panel. Chat streams replies and shows tool activity. The agent's tools navigate to coordinates and export an image in the open tab. Stop requests cancellation; completed changes remain.

This is a local development integration. Production agent requests are rejected until session authorization is implemented. Chat resets on session changes, page navigation that unmounts the panel, and refresh.

## Sessions

A session is a named, saved browser setup for one assembly, owned by one user. Its URL is `/browser/<uuid>`, using the ID the database generated. Opening that URL, following a link, or moving through history all open the session the same way.

The Sessions panel lists the signed-in user's sessions by name and marks the open one. Under the list, enter a name and choose an assembly to create a session; only hg38 is supported now. It starts at the assembly's default region with the coordinate ruler, GENCODE 50 basic genes in merged display, and human cCREs. The field at the top of the panel renames the open session. The delete icon removes a session.

A snapshot saves the region, browser settings, highlights, selection settings, ordered track configurations with their source ownership, and pinned track IDs. Runtime loading state, fetched data, and registered modules stay in the tab. Every first-party track module is registered so saved tracks of any of those types restore.

Edits apply immediately. About 200 ms after an edit, the tab saves the whole snapshot and name. It sends one write at a time and saves edits made during a write with the next one. A failed write may still have been saved, so the tab sends that same write again, with backoff from one to ten seconds, while you keep working; the server never applies it twice. Newer edits follow once it settles. The status above the browser shows Saving, Saved, Retrying, or Not saved. Edits the routes refuse, such as a session over 1 MB, are not sent again; the tab reports them and saves after a further edit. A session deleted elsewhere is never recreated. Its edits stay in the tab, unsaved, until **Close without saving** discards them.

Opening another session first saves every edit to the open one, including edits made while the next session loads. If that save fails, or the next session cannot be loaded, the open session stays with its edits and an error, and the URL returns to it. Deleting the open session waits for a write in progress, then deletes it, and the browser shows no session. If deletion fails, the session stays open and keeps saving. A session that fails to load is never overwritten; the browser offers to try again.

Closing or reloading the tab while edits are unsaved, including edits that cannot be saved, asks for confirmation. The tab does not try to save during unload.

Several tabs may edit one session. When another tab or window saved it after this tab's edits were based on it, this tab reports a conflict instead of overwriting, and keeps its edits. **Save over it** saves them on top of the other version; **Close without saving** discards them. Until then they count as edits that cannot be saved: switching sessions or accounts keeps them here. Tabs do not merge each other's edits.

The saved-session list refreshes when the window regains focus. Visiting Settings or Collections keeps the open session and its stores.

### Accounts

Without `GB_IDENTITY`, the app uses Clerk. `proxy.ts` runs `clerkMiddleware()` on every route except static files, the root layout renders `ClerkProvider`, and `/sign-in` shows Clerk's sign-in form. The sidebar's account menu saves and closes the current session before opening Clerk's account management or signing out, or the sidebar shows a sign-in link when signed out. It replaces Clerk's user button, whose sign-out cannot wait for saving. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` at runtime. `CLERK_JWT_KEY`, the instance's PEM public key, lets Clerk verify session tokens without fetching its keys. Without keys in development, Clerk starts its keyless mode, which creates a temporary Clerk application. The root layout renders on each request, so builds need no Clerk keys. Sign-in through the Clerk development instance works on Vercel deployments. A production instance accepts only its own domain; see [Deploy to Vercel](docs/02-guides/deployment.md#configure-clerk).

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
| `PUT /api/sessions/:id`    | Replace its name and snapshot at a revision.            |
| `DELETE /api/sessions/:id` | Delete it. Responds 204.                                |

Sessions carry a `revision`, starting at 1. `PUT` takes `{ name, snapshot, revision, saveId }`: the revision the edits were based on and a new UUID for each logical save. It never recreates a deleted session. It applies only at the current revision and returns the metadata with the next one. Sending the same `saveId` again after its response was lost returns that result without applying it twice.

Bodies are limited to 1 MB. Rejections are `{ code, message }` with status 400 `INVALID_INPUT`, 401 `UNAUTHENTICATED`, 404 `NOT_FOUND` (including another user's session), 409 `ASSEMBLY_CHANGED`, or 409 `CONFLICT` when the session is at another revision. Other failures return 500 without detail and log the error on the server.

Server code can use the same operations directly. `composition/server.ts` exposes `getSessions()`, which only server code may import:

```ts
const sessions = await getSessions();
const saved = await sessions.create({ name: "Promoter scan", snapshot });
await sessions.update(saved.id, {
  name: saved.name,
  snapshot: edited,
  revision: saved.revision,
  saveId: crypto.randomUUID(),
});
```

### Database

`compose.yaml` runs PostgreSQL on `127.0.0.1:5432` with a named volume, matching `DATABASE_URL` in the example file. `pnpm web db:stop` stops it. Any PostgreSQL server works if you change `DATABASE_URL`. After changing a feature's `server/table.ts`, run `pnpm web db:generate` and commit the new files in `drizzle/`.

The database tests need a PostgreSQL server. Set `GB_TEST_DATABASE_URL` to a connection that may create databases, such as `postgres://genomebrowser:genomebrowser@127.0.0.1:5432/postgres` with the compose database. Each run creates and drops its own database. Without the variable, the tests are skipped locally and fail in CI, which runs a PostgreSQL service.

`compose.yaml` also runs Redis on `127.0.0.1:6379`, matching `REDIS_URL`, for agent commands. The agent command tests use `GB_TEST_REDIS_URL`, such as `redis://127.0.0.1:6379`, with keys of their own; like the database tests, they are skipped locally without it and fail in CI without it.

In production, sessions use Google Cloud SQL through Google's Cloud SQL connector, which encrypts the connection to the instance's public IP without authorized networks. Set `INSTANCE_CONNECTION_NAME` (`<project>:<region>:<instance>`), `DB_NAME`, `DB_USER`, and `DB_PASSWORD`; `DATABASE_URL` is then ignored, and missing Cloud SQL settings fail instead of falling back to it. Outside Vercel, the connector uses the machine's Google application default credentials.

On Vercel, the connector authenticates as a Google service account through Workload Identity Federation, using the deployment's OIDC token, so no Google key is stored. Each server process keeps a pool of at most five connections. The server reads credentials only when an operation first runs, so builds do not need them.

Builds do not run migrations. `pnpm web db:migrate` reads only `DATABASE_URL`, so apply migrations to Cloud SQL through the Cloud SQL Auth Proxy. [Deploy to Vercel](docs/02-guides/deployment.md) covers the Google Cloud, Vercel, and Clerk setup, migrations, and the errors a misconfiguration produces.

### Sessions saved by the old server

Before this app saved sessions, a separate browser server kept them in SQLite by URL name, with no owner. Neither the browser nor the server reads that file now, and nothing claims those sessions automatically. An administrator can copy them to one user:

```sh
pnpm web sessions:import-sqlite --sqlite <path to browser.sqlite> --owner <user ID>
```

Each copy gets a new UUID and keeps the old ID as its name. Add `--session <old ID>` once per session to copy only some. The script opens the SQLite file read-only. It skips sessions already copied unchanged for that owner and lists any snapshot that fails validation. The owner is a Clerk user ID, or a mock user ID locally.

## Control a browser tab

Agents control the browser through commands. Each command is an agent tool that runs in the tab where the conversation's session is open and returns its own result once the tab applies it; `set_region` returns the region shown and whether it was clamped. `export_image` shows an image of the current view to the user in a preview with a Download button and returns its file name and size; the image is not sent to the agent, and nothing is saved until the user downloads it. The model never chooses the session. Only the first tab to open a session receives its commands. Later tabs keep retrying and take over when that tab closes.

Remote control is a user setting stored in PostgreSQL and defaults on for new accounts. Turn it off under **Remote control** in Settings; the choice survives reloads and sign-ins. Tabs in the same browser refresh the setting when another tab changes it, and all tabs refresh on window focus. Command connection and reply routes also check the saved preference. While on, the tab connects the open session once it has loaded. The connection closes as soon as that session is replaced, closed, or deleted, the account changes, or its edits can no longer be saved, such as after it was deleted elsewhere. The tab then connects the next session it opens. A command that arrives after its session was replaced fails with `SESSION_CLOSED` and changes nothing. Turning remote control off closes the stream; commands for the session then fail. While Redis is unreachable the Agent panel keeps reconnecting; sessions still load and save.

A tool call fails with a validation error for invalid parameters, `NOT_CONNECTED` when no tab has the session open with remote control on, `TIMEOUT` when the tab does not reply within five seconds, including while Redis is unreachable, `CANCELLED` when the agent stops, `RELAY_FAILED` when Redis rejects the command, and the store's own code, such as `UNKNOWN_CHROMOSOME`, when the tab rejects the command. `export_image` fails with `EXPORT_FAILED` when the browser page is not open, tracks are still loading, or the image is too large, and with `CANCELLED` when the export outlasts the five-second limit or the agent stops; a cancelled export shows no preview. A timeout or disconnect can occur after the tab changes its state but before its reply reaches the agent. Do not assume a failed call left the region unchanged.

The tab opens an SSE stream at `/api/sessions/<id>/commands?tab=<tab ID>` and posts each reply to the same path. Both require the signed-in owner of the session. The agent and Next.js can run in different processes, so commands and replies pass through Redis pub/sub (`REDIS_URL`); nothing is stored, and commands are not replayed after reconnection. Redis also records which tab and connection hold each session, so a tab can reconnect at once with its own tab ID, and its old connection ending later does not free the session.

External MCP clients are not connected yet. Eve can publish the same tools through its MCP channel once callers can be authorized for a session.

## Change the product

```text
app/           # Next.js routes and layout composition
features/      # Product UI, operations, schemas, and feature server code
shared/        # Generic workspace shell, panels, and theme
composition/   # Concrete providers, navigation, and server dependencies
```

Keep UI and domain logic with their feature. Sessions own live stores, metadata, persistence, and Effect autosave; account owns identity; agent owns the Effect remote-control connection and the commands. Features can consume each other through focused interfaces, but must not import composition. Shared workspace code must not import features. See [feature placement](../../docs/feature-placement.md#web-app).

The workspace layout mounts one session provider per account. Use `useSession` with focused selectors and call its complete operations; panels should not coordinate saving, cancellation, or navigation themselves. Keep providers above routes so navigation preserves their state. See [data flow](docs/02-guides/dataFlow.md) for lifetimes and [routing](docs/02-guides/routing.md) for URL behavior.

To add a product page, put its UI in `features/`, import it from a thin `app/` route, and add its navigation entry in `composition/navigation.tsx`. Follow [Pages and panels](docs/02-guides/pages.md). To add an agent command, follow [Add a command](docs/02-guides/agent.md#add-a-command).

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/contributing/testing.md).

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
```

The build runs `eve build`, then `next build`. `next start` also starts the built agent on loopback port 4274. Set `REDIS_URL` for agent commands. For an HPC deployment reached through an SSH tunnel, forwarding web port 3000 is sufficient.

For Vercel, set the project's Root Directory to `apps/web` and enable access to files outside that directory so workspace dependencies are included. The app's `vercel.json` selects Next.js and builds through Turbo from the repository root, which builds workspace dependencies before the app; Eve deploys the agent with it. Sessions need Cloud SQL and Clerk, and agent commands need Redis, such as Upstash from the Vercel Marketplace, which sets `REDIS_URL`. Follow [Deploy to Vercel](docs/02-guides/deployment.md) to configure them.
