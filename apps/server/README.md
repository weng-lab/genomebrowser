# Browser server

`@weng-lab/browser-server` is a private persistent Node.js relay. It sends commands to connected browser tabs and waits for their replies. Live browser and track state remain in the web app. The server saves serializable snapshots as one shared SQLite session.

Use Node.js 24 or newer. From the repository root, run `pnpm dev:server`, or run `pnpm dev` to start web and server together. See the [web app guide](../web/README.md) for complete setup, curl examples, session behavior, and deployment instructions.

| Environment variable | Default                                       | Purpose                                                      |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `GB_SERVER_HOST`     | `127.0.0.1`                                   | Loopback listen address: `localhost`, `127.0.0.1`, or `::1`. |
| `GB_SERVER_PORT`     | `3001`                                        | Listen port.                                                 |
| `GB_DATABASE_PATH`   | `./data/browser.sqlite`                       | SQLite file, relative to the server working directory.       |
| `GB_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins.                             |

The local relay requires no tokens or login. It binds to loopback, rejects non-loopback Host values, and rejects browser origins outside the configured list. Client IDs select connected tabs; they are not credentials. Authentication and ownership checks for cloud deployment belong to the host system and are not implemented here.

For the end-to-end paths, see [architecture and data flow](../web/docs/02-guides/dataFlow.md). Shared application terms live in the [app glossary](../web/glossary.md#commands-and-persistence).

## Code layout

```text
src/
  main.ts                       # Environment, database, listen, shutdown
  server.ts                     # Wire the relay, routes, and Node listener
  protocol.ts                   # Shared browser-safe messages and schemas
  relay.ts                      # Connected browsers and SSE delivery
  pendingCommands.ts            # Reply tracking, timeouts, cancellation, cleanup
  commands/
    setRegion.ts                # Validate a region request and dispatch it
  http/
    routes.ts                   # Explicit endpoint registration
    middleware.ts               # Local hosts, origins, and request limits
    connections.ts              # Open SSE connections and receive replies
    session.ts                  # Validate and save snapshots
  storage/
    sessionRepository.ts        # Async load/save interface
    sqlite.ts                   # SQLite implementation
```

Command handlers request dispatch through the relay. They do not manage connection maps, heartbeat timers, pending replies, or cancellation. The relay owns connections and gives each browser a pending-command tracker. That tracker registers replies before sending and cleans up on acknowledgement, timeout, cancellation, or disconnect. Routes select connection checks and request limits from `http/middleware.ts`; database setup stays in the entry point.

`@weng-lab/browser-server/protocol` exports browser-safe Zod schemas and inferred types directly from source. Frontend consumers must never import the Node.js implementation.

## Add a command

1. Define its validated message and result in `src/protocol.ts`.
2. Add a handler under `src/commands/`, following `setRegion.ts`. Validate the request and dispatch the command through the relay.
3. Register its HTTP method and path in `src/http/routes.ts`, with the appropriate connection check and body limit.
4. Allow the new path through the web app's `app/api/browser/[...path]/proxy.ts`, and handle the message in `browser/execute.ts`. Update reply handling if the result contract changes.
5. Extend the HTTP/SSE tests to send the request and acknowledge the result, then verify the real browser-store action in the web tests.

Keep registration explicit. A command succeeds only after the browser applies it and replies. Reuse the relay's timeout and cleanup behavior rather than adding it to individual command files.

To change storage, implement `SessionRepository` and supply it in `main.ts`. Routes and command handlers do not depend on SQLite.

Build with `pnpm exec turbo run build --filter=@weng-lab/browser-server`, then run `pnpm --filter @weng-lab/browser-server start`. Host one persistent relay instance. Commands are not replayed, and tenant authentication is not implemented. Session persistence is supplied through an asynchronous repository interface; SQLite is the current adapter.
