# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, a persistent browser session, the generic workspace layout, and an API proxy to the independent Node.js command relay. The current setup is local-only and has no authentication. Your host system can supply authentication when adding cloud deployment.

The [app docs](docs/README.md) cover [architecture and data flow](docs/02-guides/dataFlow.md), adding routes, panel behavior, and styling. Terms are defined in the [app glossary](glossary.md).

## Run locally

Use Node.js 24 or newer and install dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/browser`. The root redirects there. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps AppProviders, Workspace, and the browser stores mounted during navigation.

`pnpm dev:web` starts only Next.js. `pnpm dev:server` starts only the relay. No token or account setup is required. Both processes bind to loopback for local use.

The default relay address is `http://127.0.0.1:3001`. Next.js reads `GB_SERVER_URL` at runtime to choose another relay. The proxy and relay accept loopback Host values and check browser origins. Connection IDs select tabs; they are not credentials. Local callers can list connections, send commands, and save the shared session.

## Shared session

The app saves one shared hg38 session in SQLite. Set `GB_DATABASE_PATH` in the relay process to choose the database file; the default is `./data/browser.sqlite`, relative to its working directory. The server creates the parent directory. Keep this file on persistent storage when hosting the relay.

The initial SSE handshake supplies the saved snapshot. The browser restores it before showing the browser view, or starts with the default hg38 region, coordinate ruler, GENCODE 50 basic genes in merged display, and human cCREs when there is no saved snapshot. The snapshot includes the viewport region, browser settings, highlights, selection settings, ordered track configurations and source ownership, and pinned track IDs. Runtime loading state, fetched data, track resources, registered modules, and functions stay local.

Changes autosave after 200 ms of inactivity. Each tab sends one save request at a time and retries a failed save after two seconds. Reconnection keeps that tab's local session and any unsaved edits instead of restoring again. Wait for **Saved** at the top left of the browser center panel before refreshing or closing the tab; closing does not flush pending edits.

All tabs share the same saved session. The last save wins, and existing tabs do not receive each other's edits. There are no per-user sessions, tenant isolation, or conflict resolution. A new tab or refresh restores the last successfully saved snapshot.

The relay receives an asynchronous `SessionRepository` with `load()` and `save(snapshot)` operations. Its SQLite adapter is implemented in `apps/server/src/storage/sqlite.ts`; a future remote Postgres adapter can use the same interface. No Postgres adapter is implemented.

## Control a browser tab

The Agent panel on the Browser page accepts a one-based display region and sends it through HTTP to the relay, then SSE to this tab's stores. It reports the browser acknowledgement.

For terminal control, open Settings and copy the Browser connection ID after Remote control shows Connected. Each tab has its own ID. Reconnection assigns a new ID, so choose the intended tab explicitly when several are open.

In another terminal, list connected clients:

```sh
curl http://localhost:3000/api/browser/clients
```

Set `CLIENT_ID` to the ID from Settings or the list. Move the browser to a zero-based, half-open region:

```sh
export CLIENT_ID='PASTE_BROWSER_CONNECTION_ID_HERE'
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"chromosome":"chr1","start":100000,"end":200000}' \
  "http://localhost:3000/api/browser/clients/$CLIENT_ID/region"
```

Use `http://127.0.0.1:3001` in place of `http://localhost:3000` to call the relay directly. Both use the `/api/browser` prefix. The POST waits for the selected browser to apply the command and returns its result, including the actual region and whether it was clamped. Check the visible region on the Browser page. Success means the store accepted the region; it does not mean track data has finished rendering.

The relay rejects invalid region JSON with 400 and an absent browser with 404. Non-loopback hosts and disallowed origins return 403. A browser validation failure returns 422. Disconnection while awaiting a reply returns 409, too many pending commands returns 429, and a command without a reply times out with 504. A failed Next.js connection to the relay returns 503.

A timeout or disconnect can occur after the browser changes its state but before its acknowledgment reaches the caller. Do not assume a failed request left the region unchanged or automatically retry it.

The browser opens an SSE stream at `/api/browser/events`. Its `connected` event supplies `clientId` and a saved `snapshot` or `null`. Commands carry a unique `commandId` and `expiresAt`; replies go to `/api/browser/clients/:id/results` without a token. Commands are not replayed after reconnection. The relay tracks live streams and pending requests in memory and stores the shared snapshot in SQLite. `POST /api/browser/clients/:id/session` accepts a validated snapshot up to 1 MB for a connected client and returns `{ "ok": true }` after saving. Snapshot load or save failure returns 503.

## Change the product

The shared `app/(workspace)/layout.tsx` wraps route children in `AppProviders` and `Workspace`. `AppProviders` initializes the browser-only session and command relay connection. `browser/` owns shared browser behavior, including the stores in `BrowserSession.tsx` and the command connection and execution. Keep browser behavior used across routes there. The browser page's views and panels belong in `app/(workspace)/browser/`.

Generic layout, panels, and theme live in `components/workspace/` and must not import domain code. `Workspace` owns the lifetime of panel state defined in `panels/panelState.tsx`. The `frame/` group contains the shared header, sidebar, and title rows. Panel sizing and collapse behavior belong in `panels/`, where `SidePanel` uses `Resizable`; transition enablement lives in `useTransitionEnabled.ts`. The Next.js API route delegates relay forwarding to its colocated `app/api/browser/[...path]/proxy.ts`.

To add a product page:

1. Create `app/(workspace)/<name>/page.tsx` as a normal Next.js server page. Render `WorkspacePage` with the page's title, optional subtitle and side panels, and center children. Colocate domain components with the route and mark interactive components as client components.
2. Add a link to `app/(workspace)/navigation.tsx` with `href`, `label`, `icon`, and optional `placement: "bottom"`. Navigation contains no panel definitions or page components.
3. Keep the existing shared layout so navigation preserves browser stores and panel state. Route-local component state may reset when navigating away. Refreshing creates new stores and restores the shared saved session through the initial relay connection.

There is no central page registry or page export step. See [Pages and panels](docs/02-guides/pages.md) for a route example.

Commands have individual handlers under `apps/server/src/commands/`, with explicit route registration in `http/routes.ts`. The relay owns SSE delivery and pending replies. Follow [Add a command](../server/README.md#add-a-command) for the server, proxy, browser execution, and test changes. Keep the protocol export browser-safe and live browser stores in the web app.

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/02-contributing/testing.md). The [app docs](docs/README.md) describe workspace components and route composition.

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
pnpm exec turbo run build --filter=@weng-lab/browser-server
pnpm --filter @weng-lab/browser-server start
```

Run Next.js and the relay as separate processes. For an HPC deployment reached through an SSH tunnel, forwarding web port 3000 is sufficient because its API proxy reaches the relay on loopback. Set `GB_ALLOWED_ORIGINS` if the browser uses a different web origin.

Cloud deployment requires your system's authentication and ownership checks for connections and sessions, including the initial SSE handshake. The current proxy and relay intentionally reject non-loopback hosts. Add those controls before changing the local-only policy. Clerk, generated API keys, multi-user isolation, ACP, and Eve integrations are not implemented.

The relay needs a persistent process for long-lived SSE streams and pending commands. SQLite needs persistent storage. A future remote database can implement the existing session repository interface.
