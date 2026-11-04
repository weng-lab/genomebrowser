# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, user-owned saved sessions in PostgreSQL, the generic workspace layout, agent commands, and the MCP endpoint that delivers them to browser tabs through Redis. Clerk identifies users, locally and in deployments.

The [app docs](docs/README.md) cover [architecture and data flow](docs/02-guides/dataFlow.md), adding routes, panel behavior, and styling. Terms are defined in the [app glossary](glossary.md).

## Run locally

Use Node.js 24 or newer. Install dependencies from the repository root, start PostgreSQL and Redis with Docker, and apply the migrations. Before starting, set the Clerk development instance's keys in `apps/web/.env.local`; see [Accounts](#accounts).

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm web db:start
pnpm web db:migrate
pnpm dev
```

Open `http://localhost:3000/browser`. With no session open, the browser asks you to open or create one. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps the providers, the open session, and its stores mounted during navigation.

Redis at `REDIS_URL` carries agent commands to browser tabs. Sessions load and save without it; only remote control and MCP need it.

## Sessions

A session is a named, saved browser setup for one assembly, owned by one user. Its URL is `/browser/<uuid>`, using the ID the database generated. Opening that URL, following a link, or moving through history all open the session the same way.

The browser's title is the open session's name. Click it to rename the session; Enter or leaving the field saves the name with the session, and Escape cancels. The arrow beside the name opens the session menu. Under a **Recent sessions** label, it lists the open session, highlighted and checked, and the signed-in user's three most recently saved other sessions. Each row shows the session's name, then when it was last saved and how many tracks it has, such as “10:04 AM • 4 tracks”: the time for today, the weekday within the past six days, or else the date. Its delete icon removes that session. Below them, **Open session…** is a placeholder for browsing every saved session, and **New session** creates and opens a session named “New session” for hg38, the only supported assembly, with its name selected in the title so typing renames it. A new session starts at the assembly's default region with the coordinate ruler, GENCODE 50 basic genes in merged display, and human cCREs.

A snapshot saves the region, browser settings, highlights, selection settings, ordered track configurations with their source ownership, and pinned track IDs. Runtime loading state, fetched data, and registered modules stay in the tab. Every first-party track module is registered so saved tracks of any of those types restore.

Edits apply immediately. About 200 ms after an edit, the tab saves the whole snapshot and name. It sends one write at a time and saves edits made during a write with the next one. A failed write may still have been saved, so the tab sends that same write again, with backoff from one to ten seconds, while you keep working; the server never applies it twice. Newer edits follow once it settles. A pill in the title row, left of the Agent button, shows the status: a green dot and All changes saved, a spinner on gray while Saving, a spinner on amber while Retrying, or a red dot with Not saved or Changed elsewhere. Edits the routes refuse, such as a session over 1 MB, are not sent again; the tab reports them and saves after a further edit. A session deleted elsewhere is never recreated. Its edits stay in the tab, unsaved, until **Close without saving** discards them.

Opening another session first saves every edit to the open one, including edits made while the next session loads. If that save fails, or the next session cannot be loaded, the open session stays with its edits and an error, and the URL returns to it. Deleting the open session waits for a write in progress, then deletes it, and the browser shows no session. If deletion fails, the session stays open and keeps saving. A session that fails to load is never overwritten; the browser offers to try again.

Closing or reloading the tab while edits are unsaved, including edits that cannot be saved, asks for confirmation. The tab does not try to save during unload.

Several tabs may edit one session. When another tab or window saved it after this tab's edits were based on it, this tab reports a conflict instead of overwriting, and keeps its edits. **Save over it** saves them on top of the other version; **Close without saving** discards them. Until then they count as edits that cannot be saved: switching sessions or accounts keeps them here. Tabs do not merge each other's edits.

The saved-session list refreshes when the window regains focus. Visiting Settings or Collections keeps the open session and its stores.

### Accounts

Clerk identifies every user. `proxy.ts` runs `clerkMiddleware()` on every route except static files, the root layout renders `ClerkProvider`, and `/sign-in` shows Clerk's sign-in form. The sidebar's account menu saves and closes the current session before opening Clerk's account management or signing out, or the sidebar shows a sign-in link when signed out. It replaces Clerk's user button, whose sign-out cannot wait for saving. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` at runtime, locally too. Local development uses the same Clerk development instance as Vercel previews, so get its `pk_test_` and `sk_test_` keys from the Clerk Dashboard or from a project maintainer. Without both keys, every request fails with an error naming the missing key, rather than Clerk starting keyless mode with a temporary application. `CLERK_JWT_KEY`, the instance's PEM public key, lets Clerk verify session tokens without fetching its keys. The root layout renders on each request, so builds need no Clerk keys. Sign-in through the Clerk development instance works on Vercel deployments. A production instance accepts only its own domain; see [Deploy to Vercel](docs/02-guides/deployment.md#configure-clerk).

A development instance keeps a browser signed in per site, so each Vercel deployment URL needs its own sign-in. A branch's preview URL stays the same across pushes. Tests need no Clerk instance: server tests sign Clerk session tokens with a local key that Clerk verifies offline, and workspace tests replace Clerk's React hooks.

Signing out or managing the account from the sidebar first saves and closes the open session. If saving fails, a dialog offers to stay with the edits, try again, or discard them; the account changes only after that choice. An account change made elsewhere, such as signing out in another tab, discards the tab's open session, list, and pending writes, unsaved edits included. They cannot be saved without the old account's credentials, and nothing from one account reaches another.

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

Session metadata, which every route but `DELETE` returns, includes `trackCount`, the number of tracks in the saved snapshot. Sessions carry a `revision`, starting at 1. `PUT` takes `{ name, snapshot, revision, saveId }`: the revision the edits were based on and a new UUID for each logical save. It never recreates a deleted session. It applies only at the current revision and returns the metadata with the next one. Sending the same `saveId` again after its response was lost returns that result without applying it twice.

Bodies are limited to 1 MB. Rejections are `{ code, message }` with status 400 `INVALID_INPUT`, 401 `UNAUTHENTICATED`, 404 `NOT_FOUND` (including another user's session), 409 `ASSEMBLY_CHANGED`, or 409 `CONFLICT` when the session is at another revision. Other failures return 500 without detail and log the error on the server.

### Account settings route

`GET /api/account/settings` returns the signed-in user's `{ remoteControl }`, with `true` for an account that never saved a choice. `PUT` replaces it with a body of the same shape, at most 1 KB, and returns what was saved. The server derives the account; a body naming one, or any other field, is rejected with 400 `INVALID_INPUT`. Signed-out requests get 401 `UNAUTHENTICATED`. The preference is stored in the `account_settings` table. When it is off, tabs do not connect, and the server refuses MCP tool calls, tab streams, and replies.

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

`compose.yaml` runs PostgreSQL on `127.0.0.1:5432` with a named volume and Redis on `127.0.0.1:6379`, matching `DATABASE_URL` and `REDIS_URL` in the example file. `pnpm web db:stop` stops them. Any PostgreSQL or Redis server works if you change those variables. After changing `features/sessions/server/table.ts`, run `pnpm web db:generate` and commit the new files in `drizzle/`.

The database tests need a PostgreSQL server. Set `GB_TEST_DATABASE_URL` to a connection that may create databases, such as `postgres://genomebrowser:genomebrowser@127.0.0.1:5432/postgres` with the compose database. Each run creates and drops its own database. Without the variable, the tests are skipped locally and fail in CI, which runs a PostgreSQL service. The relay and MCP tests also need Redis: set `GB_TEST_REDIS_URL`, such as `redis://127.0.0.1:6379` with the compose server. Each test uses its own key namespace.

In production, sessions use Google Cloud SQL through Google's Cloud SQL connector, which encrypts the connection to the instance's public IP without authorized networks. Set `INSTANCE_CONNECTION_NAME` (`<project>:<region>:<instance>`), `DB_NAME`, `DB_USER`, and `DB_PASSWORD`; `DATABASE_URL` is then ignored, and missing Cloud SQL settings fail instead of falling back to it. Outside Vercel, the connector uses the machine's Google application default credentials.

On Vercel, the connector authenticates as a Google service account through Workload Identity Federation, using the deployment's OIDC token, so no Google key is stored. Each server process keeps a pool of at most five connections. The server reads credentials only when an operation first runs, so builds do not need them.

Builds do not run migrations. `pnpm web db:migrate` reads only `DATABASE_URL`, so apply migrations to Cloud SQL through the Cloud SQL Auth Proxy. [Deploy to Vercel](docs/02-guides/deployment.md) covers the Google Cloud, Vercel, and Clerk setup, migrations, and the errors a misconfiguration produces.

### Sessions saved by the old server

Before this app saved sessions, a separate MCP server kept them in SQLite by URL name, with no owner. Nothing reads that file now, and nothing claims those sessions automatically. An administrator can copy them to one user:

```sh
pnpm web sessions:import-sqlite --sqlite <path to browser.sqlite> --owner <user ID>
```

Each copy gets a new UUID and keeps the old ID as its name. Add `--session <old ID>` once per session to copy only some. The script opens the SQLite file read-only. It skips sessions already copied unchanged for that owner and lists any snapshot that fails validation. The owner is a Clerk user ID.

## Control a browser tab

Agents control the browser through MCP. Each command is an MCP tool that takes a `sessionId` and returns its own result once the tab applies it; `set_region` returns the region shown and whether it was clamped. `export_image` shows an image of the current view to the user in a preview with a Download button and returns its file name and size; the image is not sent to the agent, and nothing is saved until the user downloads it. `sort_tracks` sorts the loaded tracks once by the fields it names, as the Sort tracks dialog does, and returns their new order; tracks added later stay where they are added. Only one tab receives a session's commands: the first to attach. Another tab keeps retrying and takes over when that tab closes or leaves the session.

Remote control is a saved account preference, on for new accounts. Turn it off or on under **Remote control** in Settings; the choice applies to every tab of the account and survives reloads and new sign-ins. Each tab reads it when the workspace loads and again when the window regains focus. Turning it off closes this tab's connection at once; turning it on connects once the choice is saved. If the save fails, Settings reports it and the switch returns to the saved choice. If the preference cannot be loaded, the tab stays disconnected and Settings offers to retry. While on, the tab connects the open session once it has loaded. The connection closes as soon as that session is replaced, closed, or deleted, the account changes, or its edits can no longer be saved, such as after it was deleted elsewhere. The tab then connects the next session it opens. A command that arrives after its session was replaced fails with `SESSION_CLOSED` and changes nothing. The server also checks the preference for every tool call and tab connection, so MCP calls fail with `REMOTE_CONTROL_DISABLED` as soon as it is saved off. An unreachable Redis only leaves the Agent panel reconnecting; sessions still load and save.

The MCP endpoint is `/api/mcp` on the same site, such as `http://localhost:3000/api/mcp`. Every request needs the Clerk identity of the session's owner: a Clerk session token or an OAuth access token Clerk issued, sent as `Authorization: Bearer <token>`. Requests without one get 401, and the endpoint refuses browser requests from other sites. Pass the session ID from the URL, which the Agent panel also shows, and a zero-based, half-open region such as `{"chromosome":"chr1","start":100000,"end":200000}`. Success means the store accepted the region; it does not mean track data has finished rendering.

A tool call fails with an MCP validation error for invalid parameters, `NOT_FOUND` for a session the caller does not own, `REMOTE_CONTROL_DISABLED` when the account turned remote control off, `NOT_CONNECTED` when no tab has the session open with remote control on or the tab disconnects, `TIMEOUT` when the tab does not reply within five seconds, `CANCELLED` when the caller cancels the request, `BUSY` when 32 commands for the session are already waiting, `RELAY_UNAVAILABLE` when Redis cannot be reached in time, and the store's own code, such as `UNKNOWN_CHROMOSOME`, when the tab rejects the command. A cancelled or timed-out command is also stopped in the tab if it is still running. `export_image` fails with `EXPORT_FAILED` when the browser page is not open, tracks are still loading, or the image is too large, and with `CANCELLED` when it is stopped; a stopped export shows no preview. `sort_tracks` fails with `UNKNOWN_SORT_FIELD`, listing the available fields, when it names a field the tracks cannot be sorted by. A timeout, cancellation, or disconnect can occur after the tab changes its state but before its reply reaches the agent. Do not assume a failed call left the region unchanged.

Each tab opens an SSE stream at `/api/sessions/<id>/commands?tab=<tab ID>` and posts replies to the same path. Both require the signed-in owner and the preference on. A tab keeps its tab ID while it reconnects, so a reconnect replaces its own earlier connection; another tab gets 409 until the session is free. Redis holds a short lease naming the one connection that receives the session's commands, renewed by the stream's heartbeat, so a connection whose server stopped without cleanup frees the session within 45 seconds. A stream ends itself after four minutes and the tab reconnects. Commands carry a unique `commandId` and `expiresAt` and are never replayed. Redis carries only commands, cancellations, replies, and leases, in a namespace per Vercel deployment, so an older preview's agents cannot reach a newer preview's tabs.

## Change the product

```text
app/           # Next.js routes and layout composition
features/      # Product UI, operations, schemas, and feature server code
shared/        # Generic workspace shell, panels, and theme
composition/   # Concrete providers, navigation, and server dependencies
```

Keep UI and domain logic with their feature. Sessions own live stores, metadata, persistence, and Effect autosave; account owns identity; agent owns command definitions, the Effect remote-control connection, and the Redis relay; MCP owns the endpoint that publishes commands as tools. Features can consume each other through focused interfaces, but must not import composition. Shared workspace code must not import features. See [feature placement](../../docs/feature-placement.md#web-app).

The workspace layout mounts one session provider per account. Use `useSession` with focused selectors and call its complete operations; panels should not coordinate saving, cancellation, or navigation themselves. Keep providers above routes so navigation preserves their state. See [data flow](docs/02-guides/dataFlow.md) for lifetimes and [routing](docs/02-guides/routing.md) for URL behavior.

To add a product page, put its UI in `features/`, import it from a thin `app/` route, and add its navigation entry in `composition/navigation.tsx`. Follow [Pages and panels](docs/02-guides/pages.md). To add an agent command, follow [Add a command](#add-a-command).

### Add a command

1. Define the command in its own file under `features/agent/commands/`:

   ```ts
   export const setRegion = defineCommand({
     name: "set_region",
     description: "Move the genome browser to a region. ...",
     params: z.strictObject({ region: regionSchema }),
     result: z.strictObject({ region: regionSchema, clamped: z.boolean() }),
     run({ stores }, { region }) {
       const outcome = stores.useBrowserStore.getState().setRegion(region);
       if (!outcome.ok) return outcome;
       return { ok: true, value: { region: outcome.region, clamped: outcome.clamped } };
     },
   });
   ```

   Do not add `sessionId` to `params`; the MCP tool adds it. Return what the command did, not the whole session. Call an existing action rather than reimplementing its validation, and return `{ ok: true, value }` or the action's `{ ok: false, code, error }`.

2. List it in `commands` in `features/agent/commands/index.ts`. The MCP endpoint publishes it as a tool, and the tab runs the same definition.

`run` receives `CommandApp`, which holds the open session's stores and the app actions that need browser code, plus an `AbortSignal`. Make edits synchronously. A command can be async for work that only reads; the signal aborts when the session closes, remote control turns off, the command expires, or its caller cancels it, so check it before anything the user would see. Command files also load on the server, so lint allows only type imports from browser packages there. When a command needs browser work, add an action to `CommandApp` and supply it in `RemoteControlProvider.tsx`. Add a web test that sends the command to the tab, following `test/remoteControl.test.tsx`.

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/contributing/testing.md).

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
```

For Vercel, set the project's Root Directory to `apps/web` and enable access to files outside that directory so workspace dependencies are included. The app's `vercel.json` selects Next.js and builds through Turbo from the repository root, which builds workspace dependencies before the app. Sessions need Cloud SQL and Clerk; remote control and MCP also need Redis. Follow [Deploy to Vercel](docs/02-guides/deployment.md) to configure them. The UI, saved sessions, MCP endpoint, and tab command routes deploy together, so each preview is complete on its own.
