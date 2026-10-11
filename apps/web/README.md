# Web app

`@weng-lab/web` is the Next.js genome browser application. It owns product routes, a persistent browser session, the generic workspace layout, and an API proxy to the independent Node.js command relay. Local and cloud deployments use this same app.

The [app docs](docs/README.md) cover adding routes, panel behavior, and styling.

## Run locally

Use Node.js 24 or newer and install dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
export GB_API_TOKEN=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')
pnpm dev
```

Open `http://localhost:3000/browser`. The root redirects there. `/collections` and `/settings` are separate Next.js routes; unknown URLs return 404. The shared route layout keeps AppProviders, Workspace, and the browser stores mounted during navigation.

`pnpm dev:web` starts only Next.js. `pnpm dev:server` starts only the relay and requires the token. If using separate terminals, export the same `GB_API_TOKEN` value in the relay terminal and the terminal making API calls. Do not generate a different token for each terminal.

The default relay address is `http://127.0.0.1:3001`. Next.js reads `GB_SERVER_URL` at runtime to choose another relay. It forwards authorization supplied by the caller and never inserts `GB_API_TOKEN`. The browser client receives only a token scoped to replies for its own connection.

## Control a browser tab

Open Settings and copy the Browser connection ID after Remote control shows Connected. Each tab has its own ID. Reconnection assigns a new ID, so choose the intended tab explicitly when several are open.

In another terminal, export the token used to start the relay, then list connected clients:

```sh
export GB_API_TOKEN='PASTE_THE_SAME_TOKEN_HERE'
curl -H "Authorization: Bearer $GB_API_TOKEN" \
  http://localhost:3000/api/browser/clients
```

Set `CLIENT_ID` to the ID from Settings or the list. Move the browser to a zero-based, half-open region:

```sh
export CLIENT_ID='PASTE_BROWSER_CONNECTION_ID_HERE'
curl -X POST \
  -H "Authorization: Bearer $GB_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"chromosome":"chr1","start":100000,"end":200000}' \
  "http://localhost:3000/api/browser/clients/$CLIENT_ID/region"
```

Use `http://127.0.0.1:3001` in place of `http://localhost:3000` to call the relay directly. Both use the `/api/browser` prefix. The POST waits for the selected browser to apply the command and returns its result, including the actual region and whether it was clamped. Check the visible region on the Browser page. Success means the store accepted the region; it does not mean track data has finished rendering.

The relay rejects missing credentials with 401, invalid region JSON with 400, and an absent browser with 404. A browser validation failure returns 422. Disconnection while awaiting a reply returns 409, too many pending commands returns 429, and a command without a reply times out with 504. A failed Next.js connection to the relay returns 503.

A timeout or disconnect can occur after the browser changes its state but before its acknowledgment reaches the caller. Do not assume a failed request left the region unchanged or automatically retry it.

The browser opens an SSE stream at `/api/browser/events`. Its `connected` event supplies `clientId` and a private `resultToken`. Commands carry a unique `commandId` and `expiresAt`; replies go to `/api/browser/clients/:id/results` with that private token. Commands are not replayed after reconnection. The relay retains pending requests, not genome state.

## Change the product

The shared `app/(workspace)/layout.tsx` wraps route children in `AppProviders` and `Workspace`. `AppProviders` initializes the browser-only session and command relay connection. `session/BrowserSession.tsx` owns browser and track stores; `commands/` applies commands to those stores. Generic layout, panels, and theme live in `components/workspace/` and must not import domain code.

To add a product page:

1. Create `app/(workspace)/<name>/page.tsx` as a normal Next.js server page. Render `WorkspacePage` with the page's title, optional subtitle and side panels, and center children. Colocate domain components with the route and mark interactive components as client components.
2. Add a link to `navigation.tsx` with `href`, `label`, `icon`, and optional `placement: "bottom"`. Navigation contains no panel definitions or page components.
3. Keep the existing shared layout so navigation preserves browser stores and panel preferences. Route-local component state may reset when navigating away. Refreshing starts a new browser session.

There is no central page registry or page export step. See [Pages and panels](docs/02-guides/pages.md) for a route example.

To add a command, define its validated message and result contract in `apps/server/src/protocol.ts`. Extend the relay handler in `server.ts` to validate the request, target an explicit connected client, assign an ID and expiry, and await its result. Extend `commands/execute.ts` to invoke the corresponding existing store action. Update `commands/connection.ts` if the reply contract changes, and extend protocol/server tests. Keep the protocol export free of Node.js imports. Do not move the browser stores into the relay or acknowledge a command before the browser applies it.

Run `pnpm verify` for the workspace check. React changes also follow the [render verification guidance](../../docs/02-contributing/testing.md). The [app docs](docs/README.md) describe workspace components and route composition.

## Build and host

```sh
pnpm exec turbo run build --filter=@weng-lab/web
pnpm --filter @weng-lab/web start
pnpm exec turbo run build --filter=@weng-lab/browser-server
pnpm --filter @weng-lab/browser-server start
```

Run Next.js and the relay as separate processes. For an HPC deployment reached through an SSH tunnel, forwarding web port 3000 is sufficient because its API proxy reaches the relay on loopback. Set `GB_ALLOWED_ORIGINS` if the browser uses a different web origin.

The same Next.js frontend can run on Vercel. Set `GB_SERVER_URL` to the HTTPS address of a separately hosted persistent relay and set its `GB_ALLOWED_ORIGINS` to the frontend origin. The relay needs long-lived SSE connections and in-memory connection ownership; run a single relay instance with persistent hosting. It is not an indefinite Vercel function. Verify the frontend hosting plan supports the required stream lifetime; frontend stream termination causes a new browser connection ID.

This API is for a trusted single-user or operator instance with a shared administrative token. It does not provide multi-user tenant isolation. Storage, saved sessions, ACP, and Eve integrations are not implemented.
