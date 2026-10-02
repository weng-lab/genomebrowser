# API server

Part of the [architecture](README.md). Decisions: [0003](decisions/0003-sse-for-tab-connections.md), [0004](decisions/0004-separate-api-server.md), [0005](decisions/0005-postgres-listen-notify-bus.md), [0012](decisions/0012-hono-for-the-api-server.md).

## Purpose

The API server owns everything stateful and long-lived: login, the database, browser sessions, the MCP endpoint, open tab connections and the message bus between server instances. The same codebase runs on the user's machine inside the `gb` CLI and on Cloud Run for the cloud site.

## Structure

The shared core lives in `apps/server`: sessions, MCP tools, routing commands to tabs, the command definitions, the bus interface, the session-store interface and the HTTP routes the workspace calls. It defines interfaces only and never imports a database driver or auth library.

Two apps build a server from it and plug in their own implementations:

- `apps/local`: the local server inside the `gb` CLI.
- `apps/cloud`: the cloud API server, deployed to Cloud Run. It lives in the same app as the Next.js site but is a separate build.

```ts
// apps/local/src/main.ts
createServer({
  sessions: [
    sqliteStore("~/.gb/gb.db"),
  ],
  bus: memoryBus(),
  auth: localUser({ launchToken }),
  extras: [acpBridge(), serveStatic("workspace-dist")],
});

// apps/cloud/api/main.ts
createServer({
  sessions: [postgresStore(process.env.DATABASE_URL)],
  bus: postgresBus(process.env.DATABASE_URL),
  auth: accounts({ mcpOAuth: true }),
});
```

The account system, OAuth server and email exist only in `apps/cloud`, so they never ship in the CLI. Later, local cloud access will add a `remoteStore` and device-flow sign-in (see [identity-and-security.md](identity-and-security.md#local-sign-in-device-flow)). See [decision 0013](decisions/0013-gb-app-layout.md) for the layout.

Don't put the API server's entry in a root `server.ts` in `apps/cloud`: Eve's bundler treats that file as its own server entry.

Framework: Hono, built on web `Request` and `Response` like Next.js route handlers. The MCP SDK's web-standard transport mounts on it directly. See [decision 0012](decisions/0012-hono-for-the-api-server.md).

## Routes

| Route | Used by | Purpose |
| --- | --- | --- |
| `/api/*` | Workspace, Next.js server code, the CLI's remote store | Sessions, account, permissions and the rest of the app API. Versioned. |
| `GET /rpc` | Workspace tabs | SSE stream that delivers commands and approval requests |
| `POST /rpc` | Workspace tabs | Command results and approval answers |
| `/mcp` | Agents and MCP clients | MCP endpoint (Streamable HTTP) |
| `/oauth/*` | MCP clients, local `gb` apps | OAuth for MCP clients. Device flow is added later for local cloud sign-in. Cloud version only. |

## Tab connections

A tab holds `GET /rpc` open as an SSE stream and receives commands as events. It POSTs each result to `POST /rpc`, tagged with the call id. SSE works through ordinary HTTP infrastructure, carries the login cookie, and `EventSource` reconnects on its own.

The tool pipeline for each MCP call:

```
access check (canAccess) → permission (allow / ask / deny) → schema check → deliver to tab → wait for result
```

A command waiting on a tab times out after a few seconds and returns an error to the agent.

## Message bus

The bus delivers a command to whichever server instance holds the target tab's stream, and delivers the result back to the instance waiting on the call.

**Local:** one process holds every tab connection, so the bus is in memory.

**Cloud:** with several Cloud Run instances, the tab's stream and an agent's MCP call can land on different instances. Session affinity doesn't help, because the tab and the agent are different clients. Postgres `LISTEN`/`NOTIFY` connects them:

1. Each instance keeps one direct database connection open and listens on a shared channel.
2. The instance handling the MCP call sends `NOTIFY` with the call id, the target tab and the command.
3. Every instance hears it. The one holding that tab's stream forwards the command to the tab.
4. The tab POSTs the result to whichever instance it reaches. That instance sends `NOTIFY` with the call id and the result.
5. The instance waiting on that call id returns the result to the agent.

Limits and behavior:

- A `NOTIFY` payload holds at most 8000 bytes. Commands fit. Large results go in a table, with only the row id sent.
- Postgres doesn't store notifications. A message sent while an instance restarts is lost, and the agent sees a timeout.
- The listening connection must be a direct, long-lived connection, not one shared through a transaction pooler.
- Agent traffic is small (a few tool calls per second at most). Track data never passes through the API server.

Redis pub/sub is the fallback if traffic outgrows Postgres. Only the bus implementation changes.

## Risks

- **Reconnects.** Cloud Run ends requests after at most 60 minutes, and every deploy drops all streams. A command in flight during a reconnect must fail cleanly rather than hang.
- **Version drift.** Old CLI installs keep calling the cloud `/api`. Version it and keep changes backward compatible.

## Open questions

Each question has a default. Build with the default unless it changes.

### API-2. How long does a command wait for a tab?

- **10 seconds for commands, 2 minutes for approval prompts (default).** View changes finish in milliseconds; approvals wait for a person.

### API-3. How does the server pick "the most recently focused tab"?

Focus events can arrive late or out of order.

- **The tab that last had user input, such as a click, key press or scroll (default).** If no tab has had input, the most recently connected one.
- The tab that last reported focus.
- Ask the user when several tabs are open.
