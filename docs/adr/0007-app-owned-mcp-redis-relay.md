# ADR 0007: The app owns MCP; Redis relays commands

- Status: accepted
- Date: 2026-11-03
- Supersedes: [ADR 0002](0002-web-owns-persistence-mcp-is-relay.md), [ADR 0003](0003-private-contracts-package.md)

## Context

Agents drive a live browser tab. A separate MCP server kept connected tabs and pending commands in memory, with no database, so it could not check who owned a session or whether the account allowed remote control. It needed its own long-lived, single-instance deployment, and every Vercel preview needed a matching backend. Its contracts package split each command between a contract and a separate web handler.

## Decision

- `apps/web` serves the MCP endpoint (`/api/mcp`) and the tab command routes (`/api/sessions/[id]/commands`) alongside its UI, so one Vercel deployment, previews included, has everything an agent needs.
- Each command is defined once in `features/agent/commands/`: its tool name, description, parameter and result schemas, and the function the tab runs. The MCP endpoint publishes every listed command as a tool. Command files import only schemas and types, so they load on the server; browser work reaches them through `CommandApp`.
- The app authorizes every dispatch, tab attachment, and reply from verified Clerk identity, session ownership, and the account's saved Remote Control preference. A session ID grants nothing. MCP accepts Clerk session tokens and OAuth access tokens; anonymous requests are refused.
- Redis carries commands, cancellations, replies, and a short-lived per-session lease naming the one connection that receives commands. It holds no application state. Each Vercel deployment uses its own namespace.
- The browser tab remains authoritative for live browser and track state; saving stays with session autosave. The transport stays SSE plus HTTP replies.

## Consequences

Remote control and MCP need `REDIS_URL`; manual browsing and saving do not. The relay bounds every dispatch, including Redis waits, propagates cancellation to the tab, and fences connection cleanup with the lease, so a stale connection can neither receive commands nor release its replacement. Commands are never replayed. Lint keeps command definitions free of browser runtime imports and keeps Redis in server modules. A new command is one definition file plus a line in the command list.
