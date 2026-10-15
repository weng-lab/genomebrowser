# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, a persistent browser session, the generic workspace layout, and rewrites to the independent Node.js browser server, which owns persistence and MCP. The current setup is local-only and has no authentication. Your host system can supply authentication when adding cloud deployment.

The [app docs](docs/README.md) cover [architecture and data flow](docs/02-guides/dataFlow.md), adding routes, panel behavior, and styling. Terms are defined in the [app glossary](glossary.md).

## Run locally

Use Node.js 24 or newer and install dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/browser`. The root redirects there, and it redirects to `/browser/local`, the default session. Any other ID in the URL, such as `/browser/my-analysis`, opens or creates that session. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps AppProviders, Workspace, and the browser stores mounted during navigation.

`pnpm dev:web` starts only Next.js. `pnpm dev:server` starts only the browser server. No token or account setup is required. Both processes bind to loopback for local use.

Next.js rewrites `/api/*` and `/mcp` to the browser server at `http://127.0.0.1:3001`. Set `GB_SERVER_URL` to use another address; rewrites are fixed when Next.js starts in development and when it builds for production. The server accepts loopback Host values and checks browser origins. Session IDs are not credentials: local callers can save sessions and control any connected tab.

## Shared session

Sessions are saved in SQLite by the session ID in the URL. IDs are 1–64 letters, digits, `_`, or `-`. Set `GB_DATABASE_PATH` in the server process to choose the database file; the default is `./data/browser.sqlite`, relative to its working directory. The server creates the parent directory. Keep this file on persistent storage when hosting the server.

The tab loads the saved snapshot with `GET /api/sessions/:id` and restores it before showing the browser view. With no saved snapshot (404), it starts with the default hg38 region, coordinate ruler, GENCODE 50 basic genes in merged display, and human cCREs. The snapshot includes the viewport region, browser settings, highlights, selection settings, ordered track configurations and source ownership, and pinned track IDs. Runtime loading state, fetched data, track resources, registered modules, and functions stay local.

Changes autosave with `PUT /api/sessions/:id` after 200 ms of inactivity. Each tab sends one save request at a time and retries a failed save after two seconds. A failed load retries after two seconds. Saving does not depend on remote control. Wait for **Saved** at the top left of the browser center panel before refreshing or closing the tab; closing does not flush pending edits.

Every tab that opens the session saves to it. The last save wins, and tabs do not receive each other's edits. There are no per-user sessions, tenant isolation, or conflict resolution. A new tab or refresh restores the last successfully saved snapshot.

The server receives an asynchronous `SessionRepository` with `load(id)` and `save(id, snapshot)` operations. Its SQLite adapter is implemented in `apps/server/src/storage/sqlite.ts`. No Postgres adapter is implemented.

## Control a browser tab

Agents control the browser through MCP. Each browser command is an MCP tool that takes a `sessionId` and returns the whole session snapshot after the tab applies it. Only the first tab to open a session receives its commands. Later tabs keep retrying and take over when that tab closes.

Remote control is on by default. Turn it off under **Remote control** in Settings to close the tab's command stream; MCP calls for the session then fail. The Browser page's right panel has an **Active Tracks** tab followed by an **Agent** tab showing the connection state. The right panel starts collapsed; opening it shows Active Tracks initially. Panel visibility is retained while navigating within the workspace. Active Tracks shows the current session's loaded tracks using the Collections tree grouping, with uncataloged tracks under Other tracks. Rulers remain in the browser and are excluded from this list and its count. Removing a track or group updates the browser immediately and uses the session autosave. The list waits for session restoration, and its catalog loads only when the tab is opened.

Connect an MCP client to `http://localhost:3000/mcp`, or to `http://127.0.0.1:3001/mcp` to skip Next.js. For example, with Claude Code:

```sh
claude mcp add --transport http genome-browser http://localhost:3000/mcp
```

Then ask the agent to call `set_region` with the session ID from the URL, such as `local`, and a zero-based, half-open region such as `{"chromosome":"chr1","start":100000,"end":200000}`. Success means the store accepted the region; it does not mean track data has finished rendering.

A tool call fails with `NOT_CONNECTED` when no tab has the session open with remote control on, `TIMEOUT` when the tab does not reply within five seconds, and the store's own code, such as `UNKNOWN_CHROMOSOME`, when the tab rejects the command. A timeout or disconnect can occur after the tab changes its state but before its reply reaches the agent. Do not assume a failed call left the region unchanged.

The tab opens an SSE stream at `/api/sessions/:id/rpc`. Commands carry a unique `commandId` and `expiresAt`, and the tab posts its reply to the same path. Commands are not replayed after reconnection. The server tracks open tabs and pending commands in memory.

## Change the product

The shared `app/(workspace)/layout.tsx` wraps route children in `AppProviders` and `Workspace`. `AppProviders` initializes the browser-only session and its server connection. `browser/` owns shared browser behavior: the stores in `BrowserSession.tsx`, saving in `persistence.ts`, remote control in `remoteControl.ts`, and command execution in `execute.ts`, all composed by `BrowserServer.tsx`. Keep browser behavior used across routes there. The browser page's views and panels belong in `app/(workspace)/browser/`.

Generic layout, panels, and theme live in `components/workspace/` and must not import domain code. `Workspace` owns the lifetime of panel state defined in `panels/panelState.tsx`. The `frame/` group contains the shared header, sidebar, and title rows. Panel sizing and collapse behavior belong in `panels/`, where `SidePanel` uses `Resizable`; transition enablement lives in `useTransitionEnabled.ts`.

To add a product page:

1. Create `app/(workspace)/<name>/page.tsx` as a normal Next.js server page. Render `WorkspacePage` with the page's title, optional subtitle and side panels, and center children. Colocate domain components with the route and mark interactive components as client components.
2. Add a link to `app/(workspace)/navigation.tsx` with `href`, `label`, `icon`, and optional `placement: "bottom"`. Navigation contains no panel definitions or page components.
3. Keep the existing shared layout so navigation preserves browser stores and panel state. Route-local component state may reset when navigating away. Refreshing creates new stores and restores the saved session.

There is no central page registry or page export step. See [Pages and panels](docs/02-guides/pages.md) for a route example.

Each command is one file in `apps/server/src/commands/`, registered in its `index.ts`. That definition supplies both the MCP tool and the store action `browser/execute.ts` runs in the tab. Follow [Add a command](../server/README.md#add-a-command). Keep the protocol export browser-safe and live browser stores in the web app.

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/02-contributing/testing.md). The [app docs](docs/README.md) describe workspace components and route composition.

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
pnpm exec turbo run build --filter=@weng-lab/browser-server
pnpm --filter @weng-lab/browser-server start
```

Run Next.js and the browser server as separate processes. Set `GB_SERVER_URL` before `next build` if the server is not at `http://127.0.0.1:3001`. For an HPC deployment reached through an SSH tunnel, forwarding web port 3000 is sufficient because the rewrites reach the server on loopback. Set `GB_ALLOWED_ORIGINS` if the browser uses a different web origin.

For Vercel, set the project's Root Directory to `apps/web` and enable access to files outside that directory so workspace dependencies are included. The app's `vercel.json` selects Next.js and builds through Turbo from the repository root, which builds workspace dependencies before the app. A frontend preview can build without a running browser server; session loading, saving, and MCP still require the separate server.

Cloud deployment requires your system's authentication and ownership checks for connections and sessions, including tab streams and MCP. The server intentionally rejects non-loopback hosts. Add those controls before changing the local-only policy. Clerk, generated API keys, multi-user isolation, ACP, and Eve integrations are not implemented.

The server needs a persistent process for long-lived SSE streams and pending commands. SQLite needs persistent storage. A future remote database can implement the existing session repository interface.

## Collections

Open **Collections** to browse the bundled hg38 catalogs. The left panel lists Reference annotations, ChromHMM comparison, cCRE comparisons, CAVE developmental methylation, Human Biosamples, and long-read RNA-seq. Selecting a name opens `/collections/[collectionId]` and displays the shared TrackSelect picker in the center pane.

Use the grid's views, grouping, filters, and pagination to find tracks. Check the tracks you want, then choose **Submit** to update the current session and return to its browser. Existing tracks from other collections are preserved. Unchecking a previously added track removes it from that collection on Submit. **Cancel** discards the draft and returns to the browser; changing collections also discards an unsubmitted draft. The selection limit is 50 tracks within the displayed collection.

The default GENCODE 50 basic track is recognized in Reference annotations, and the default aggregate cCRE track in Human Biosamples. Matching uses each default track's type and data URL, so they appear selected and in Active Tracks. Submit preserves their existing IDs and settings without adding duplicates.

The picker waits for session restoration before allowing edits. Submitted tracks use the existing autosave; wait for **Saved** before refreshing or closing the tab. All first-party track modules are registered so catalog tracks can be restored with their saved settings.

Catalog JSON files live in `app/(workspace)/collections/data/`. They are owned by this app; the route has no runtime imports from legacy applications. Collection routes send the selected collection's data to the client. The browser's Active Tracks tab loads the complete catalog lazily to resolve all loaded tracks. Set `NEXT_PUBLIC_MUI_X_LICENSE_KEY` for the shared grid's MUI X Premium license.
