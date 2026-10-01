# 0003. SSE plus POST for tab connections

Decided 2026-10-01.

## Why this came up

The server must send commands to a browser tab. A tab can't accept incoming connections, so it has to open a connection the server can write to.

## What we chose

The tab holds a server-sent events stream (`GET /rpc`) to receive commands, and POSTs each result to `POST /rpc`.

## Other options

- **WebSockets.** Two-way on one connection, but harder to run behind some proxies and serverless platforms, and auth and reconnects need more custom code.
- **Polling.** Simple, but adds latency or load for every open tab.

## What this means

- Works through ordinary HTTP infrastructure and carries the login cookie.
- `EventSource` reconnects on its own after timeouts and deploys.
- Results arrive on a separate request, which may reach a different server instance (see [0005](0005-postgres-listen-notify-bus.md)).
