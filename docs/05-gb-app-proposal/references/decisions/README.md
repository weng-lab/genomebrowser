# Decision records

Part of the [architecture](../README.md).

One short file per big decision: why it came up, what we chose, what else we looked at, and what it means. To change a decision, write a new record and add a line to the old one saying which record replaced it. That keeps the history of why things changed.

| # | Decision | Status |
| --- | --- | --- |
| 0001 | [The browser tab owns the genome browser state](0001-browser-tab-owns-state.md) | Decided |
| 0002 | [MCP is the only API for agents](0002-mcp-is-the-only-agent-api.md) | Decided |
| 0003 | [SSE plus POST for tab connections](0003-sse-for-tab-connections.md) | Decided |
| 0004 | [A separate API server, with Next.js as the UI layer](0004-separate-api-server.md) | Decided |
| 0005 | [Postgres LISTEN/NOTIFY as the cloud message bus](0005-postgres-listen-notify-bus.md) | Decided |
| 0006 | [SQLite through node:sqlite locally, Postgres cloud](0006-sqlite-locally-postgres-cloud.md) | Decided |
| 0007 | [Eve stays on Vercel](0007-eve-on-vercel.md) | Decided |
| 0008 | [A shared workspace package with a Vite shell for the CLI](0008-shared-workspace-package.md) | Decided |
| 0009 | [Device flow for local sign-in](0009-device-flow-for-local-sign-in.md) | Decided |
| 0010 | [Serve local files over HTTP from the local server](0010-serve-local-files-over-http.md) | Proposed |
| 0011 | [SSH port forwarding for remote access](0011-ssh-forwarding-for-remote-access.md) | Proposed |
| 0012 | [Hono for the API server](0012-hono-for-the-api-server.md) | Decided |
| 0013 | [The gb app lives in apps/: server, workspace, local and cloud](0013-gb-app-layout.md) | Decided |

## Template

```markdown
# NNNN. Title

Decided YYYY-MM-DD.

## Why this came up
## What we chose
## Other options
## What this means
```
