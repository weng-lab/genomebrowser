# 0005. Postgres LISTEN/NOTIFY as the cloud message bus

Decided 2026-10-01.

## Why this came up

With several API server instances, a tab's stream and an agent's MCP call can land on different instances. Session affinity doesn't help, because the tab and the agent are different clients.

## What we chose

Each instance listens on a Postgres channel. Commands and results are sent with `NOTIFY`, and the instance holding the target tab forwards the command. Locally the bus is in memory.

## Other options

- **Redis pub/sub (Upstash or Memorystore).** Built for this, but adds a service to pay for and run. Memorystore also needs private networking.
- **A cloud realtime service such as Ably or Pusher.** Same role as Redis, with another vendor.
- **A single API server instance.** Simplest, but no headroom or redundancy.

## What this means

- No extra infrastructure: cloud already uses Postgres.
- Payloads are limited to 8000 bytes, so large results go in a table.
- Notifications aren't stored. A message sent during a restart is lost and the caller times out.
- Swapping to Redis later only changes the bus implementation.
