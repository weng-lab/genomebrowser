# Browser server

`@weng-lab/browser-server` is a private persistent Node.js server. It saves browser sessions in SQLite, exposes browser commands to agents over MCP, and delivers each command to the browser tab that has that session open. Live browser and track state remain in the tab.

Use Node.js 24 or newer. From the repository root, run `pnpm dev:server`, or run `pnpm dev` to start web and server together. See the [web app guide](../web/README.md) for complete setup, MCP examples, session behavior, and deployment instructions.

| Environment variable | Default                                       | Purpose                                                      |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `GB_SERVER_HOST`     | `127.0.0.1`                                   | Loopback listen address: `localhost`, `127.0.0.1`, or `::1`. |
| `GB_SERVER_PORT`     | `3001`                                        | Listen port.                                                 |
| `GB_DATABASE_PATH`   | `./data/browser.sqlite`                       | SQLite file, relative to the server working directory.       |
| `GB_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins.                             |

The local server requires no tokens or login. It binds to loopback, rejects non-loopback Host values, and rejects browser origins outside the configured list. Session IDs select a session; they are not credentials. Authentication and ownership checks for cloud deployment are not implemented here.

| Route                        | Purpose                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/sessions`          | List saved session IDs alphabetically.                                                                        |
| `GET /api/sessions/:id`      | Load a saved snapshot, or 404 when none is saved.                                                             |
| `PUT /api/sessions/:id`      | Validate and save a snapshot of up to 1 MB.                                                                   |
| `DELETE /api/sessions/:id`   | Delete a saved snapshot. Deleting `local` returns 403; deleting an absent ID succeeds.                        |
| `GET /api/sessions/:id/rpc`  | SSE stream of commands for the tab that has the session open. A second tab for the same session receives 409. |
| `POST /api/sessions/:id/rpc` | The tab's reply to a command.                                                                                 |
| `/mcp`                       | MCP endpoint (Streamable HTTP). Every browser command is a tool that takes a `sessionId`.                     |
| `GET /health`                | Liveness check.                                                                                               |

For the end-to-end paths, see [architecture and data flow](../web/docs/02-guides/dataFlow.md). Shared application terms live in the [app glossary](../web/glossary.md#commands-and-persistence).

## Code layout

```text
src/
  main.ts                       # Environment, database, listen, shutdown
  server.ts                     # Wire routes, tab connections, MCP, and the Node listener
  protocol.ts                   # Shared browser-safe schemas for session IDs and tab messages
  commands/
    command.ts                  # The Command type and defineCommand
    setRegion.ts                # One file per command
    index.ts                    # The command registry
  mcp.ts                        # One MCP tool per registered command
  tabs.ts                       # Open tabs by session ID and SSE delivery
  pendingCommands.ts            # Reply tracking, timeouts, cancellation, cleanup
  http/
    routes.ts                   # Session, tab stream, and MCP routes
    middleware.ts               # Local hosts, origins, and request limits
  storage/
    sessionRepository.ts        # Async list/load/save/remove of sessions
    sqlite.ts                   # SQLite implementation
```

Only the first tab to open a session's stream receives its commands; later tabs are rejected until it disconnects. Several tabs may still save the same session, and the last save wins. `pendingCommands.ts` registers each reply before sending and cleans up on reply, timeout, cancellation, or disconnect. Every command replies with the whole session snapshot on success, or a `{ ok: false, code, error }` failure.

The session snapshot schema comes from `@weng-lab/session-snapshot`, shared with the web app. `@weng-lab/browser-server/protocol` and `@weng-lab/browser-server/commands` are browser-safe and export directly from source; the web app uses both. Frontend consumers must never import the Node.js implementation. Command files only import types from `@weng-lab/genomebrowser`, so the server never loads the browser library.

## Add a command

Each command is one file under `src/commands/` that holds everything about it:

```ts
// src/commands/setRegion.ts
export const setRegion = defineCommand({
  name: "set_region",
  description: "Move the genome browser to a region. ...",
  params: z.strictObject({ region: regionSchema }),
  run: (stores, { region }) => stores.useBrowserStore.getState().setRegion(region),
});
```

- `name` is the MCP tool name, in snake_case.
- `description` is what agents read to decide when and how to call it.
- `params` is a Zod object. The MCP tool adds `sessionId`, so do not include it.
- `run` executes in the browser tab with the same stores as the UI. Call an existing store action and return its result, `{ ok: true }` or `{ ok: false, code, error }`. Do not reimplement validation the store already does.

To add a command:

1. Create `src/commands/<name>.ts` with `defineCommand`, following `setRegion.ts`.
2. Add it to the `commands` array in `src/commands/index.ts`. The MCP tool and the tab's executor both read that list; nothing else needs registering.
3. Add a web test that sends the command to a tab and checks the store change, following `apps/web/test/commands.test.tsx`.

A command succeeds only after the tab applies it and replies with the whole session snapshot. The server's timeout and cleanup apply to every command.

To change storage, implement `SessionRepository` and supply it in `main.ts`. Routes do not depend on SQLite.

Build with `pnpm exec turbo run build --filter=@weng-lab/browser-server`, then run `pnpm --filter @weng-lab/browser-server start`. Host one persistent server instance. Commands are not replayed, and tenant authentication is not implemented. Session persistence is supplied through an asynchronous repository interface; SQLite is the current adapter.
