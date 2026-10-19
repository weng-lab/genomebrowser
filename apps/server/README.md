# Browser server

`@weng-lab/mcp` is the optional MCP server. It exposes app commands to agents as MCP tools and delivers each call over SSE to the browser tab connected for the given session. The tab runs the command and posts the result back. The server keeps open tabs and pending commands in memory. It has no database, saves nothing, and never reads sessions.

Use Node.js 24 or newer. From the repository root, run `pnpm dev:server`, or `pnpm dev` to start web and server together. The browser works without it. See the [web app guide](../web/README.md#control-a-browser-tab) for MCP client setup.

| Environment variable | Default                                       | Purpose                                                      |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `GB_SERVER_HOST`     | `127.0.0.1`                                   | Loopback listen address: `localhost`, `127.0.0.1`, or `::1`. |
| `GB_SERVER_PORT`     | `3001`                                        | Listen port.                                                 |
| `GB_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins.                             |

The server needs no credentials. It binds to loopback, rejects non-loopback Host values, rejects browser origins outside the configured list, and limits reply bodies to 1 MB. Session IDs only route calls; they are not credentials, and the server does not check who owns a session. MCP authentication and authorization are not implemented, so do not expose the server beyond loopback.

| Route           | Purpose                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| `GET /rpc/:id`  | SSE stream of commands for the tab connected under session ID `id`. A second tab gets 409. |
| `POST /rpc/:id` | The tab's reply to a command.                                                              |
| `/mcp`          | MCP endpoint (Streamable HTTP). Each tool takes a `sessionId`.                             |
| `GET /health`   | Liveness check.                                                                            |

## Code layout

```text
src/
  main.ts             # Environment, listen, shutdown
  server.ts           # Wire routes, tab connections, MCP, and the Node listener
  mcp.ts              # One MCP tool per command contract
  tabs.ts             # Connected tabs by session ID and SSE delivery
  pendingCommands.ts  # Reply tracking, timeouts, cancellation, cleanup
  http/
    routes.ts         # Tab stream and MCP routes
    middleware.ts     # Local hosts, origins, and body limits
```

Command contracts come from [the web app](../web/commands/README.md): each tool's name, description, parameter schema, and result schema. The server imports only the pure `apps/web/commands/contracts.ts` module and its `sessions/snapshot.ts` dependency, with no Next.js runtime or browser stores. It does not know how a command runs. `mcp.ts` validates parameters against the contract and checks the tab's result against the result schema before replying to the agent. A result that does not match fails with `INVALID_REPLY`.

Only the first tab to open a session's stream receives its commands; later tabs get 409 until it disconnects. `pendingCommands.ts` registers each reply before sending and cleans up on reply, timeout (five seconds by default), cancellation, or disconnect. Commands are not replayed. Failures reach the agent as `{ code }: { error }` tool errors, such as `NOT_CONNECTED` or `TIMEOUT`.

Adding a command needs no server change. See [Add a command](../web/commands/README.md#add-a-command).

Build with `pnpm exec turbo run build --filter=@weng-lab/mcp`, then run `pnpm --filter @weng-lab/mcp start`. Host one persistent instance that supports long-lived SSE connections.

The build emits the server and both web-owned contract modules under `dist/`. The start script runs `dist/server/src/main.js`; keep the full output tree and the server's production dependencies together when deploying. Turbo tracks the two contract files explicitly, so changes invalidate server checks without requiring a web app build.
