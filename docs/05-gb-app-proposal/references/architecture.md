# App architecture

The local app and cloud website share a React workspace and an API server. Each version supplies its own storage, sign-in, and agent connections. This page describes the planned structure; the [roadmap](roadmap.md) gives the build order.

## Where code belongs

| Location | Responsibility |
| --- | --- |
| `packages/` | The reusable genome browser library: tracks, rendering, data readers, and browser controls. |
| `apps/workspace` | Shared app UI: layout, header, session picker, genome browser, chat panel, settings, and command handlers. |
| `apps/server` | Shared API server: sessions, command definitions, MCP tools, permissions, and connections to open tabs. |
| `apps/local` | The `gb` CLI, local storage, file serving, local agent connections, and a Vite page containing the workspace. |
| `apps/cloud` | The Next.js website, Eve, accounts, and the cloud API server. |
| `apps/playground` | Experiments with the genome browser library. |

`apps/local` is published as `@weng-lab/gb`. The other app packages are private. The existing `apps/standalone` will become `apps/cloud`. See the [layout decision](decisions/0013-gb-app-layout.md).

## What differs between local and cloud

| | Local | Cloud |
| --- | --- | --- |
| Workspace page | Vite build served by `gb` | Next.js on Vercel |
| API server | Runs inside `gb` | Runs on Cloud Run |
| Database | SQLite | Postgres |
| Messages between server connections | In memory | Postgres `LISTEN`/`NOTIFY` |
| Chat agent | User's coding agent, connected through ACP | Eve, hosted with the website on Vercel |
| Sign-in | No account required | User accounts |

The local app uses ACP to connect the user's coding agent to the chat panel and MCP to let agents control the browser. This also applies when `gb` runs on a lab server. Cloud chat uses Eve. Connecting a user's own local model to the cloud workspace is outside the current scope.

Both versions expose browser tools through MCP; Eve uses those same tools.

The cloud website and API server live in `apps/cloud`, but have separate builds and deployments. Only the API server accesses the database. Next.js server code calls that API.

Local sessions stay local; cloud sessions stay in the cloud. A later release will let users sign in from `gb` to open and save cloud sessions. Keep session storage behind an interface, but do not build cloud access into the initial local app.

## How a command reaches the browser

For example, an agent asks to show a genomic region:

1. The agent calls `set_region` through the server's MCP endpoint.
2. The server checks access and permissions, then sends the command to an open tab showing the target session.
3. The workspace calls the genome browser library's `setRegion` action.
4. The tab returns the result through the server to the agent.

The server sends commands over a persistent HTTP connection called SSE. The tab sends results back with an HTTP POST. See [API server](api-server.md) for connection handling.

UI controls call the same command handlers directly. They do not need a server round trip to change the view.

## Rules for shared code

The browser tab owns live browser state. The server stores saved snapshots. Session IDs are UUIDs so local and cloud sessions can be identified independently. See [sessions and data](sessions-and-data.md).

Define each command once in `apps/server`, with a separate `server/commands` export that the workspace can import without loading server code. Handlers call the library's browser actions rather than reimplementing its genome browsing rules. See [agents and tools](agents-and-tools.md) for schemas, handlers, and error handling.

Keep `apps/workspace` independent of Next.js. Both builds render the same app interface through small entry points. Pass the API URL, authentication, chat providers, and navigation callbacks into it. A `cloudSignInEnabled` prop controls cloud account UI and starts disabled locally. Each chat provider translates its messages into a shared format so the chat UI does not depend on Eve or ACP types. See [workspace](workspace.md).

Keep database drivers and authentication libraries out of `apps/server`. The local and cloud apps supply implementations for storage, authentication, and messaging. See [API server](api-server.md).

Every agent uses the same MCP tools. The API server enforces permissions. Deleting data and changing sharing, accounts, or permissions remain UI-only actions.

[Project direction](vision.md) covers product limits. The [decision records](decisions/README.md) explain the architecture choices and identify proposals still under discussion.

[Back to the app guide](README.md)
