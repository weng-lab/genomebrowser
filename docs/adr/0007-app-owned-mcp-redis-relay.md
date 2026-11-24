# ADR 0007: The app owns MCP; Redis relays commands

- Status: accepted
- Date: 2026-11-03
- Supersedes: ADR 0002, ADR 0003

## Context

Agents drive a live browser tab. The earlier separate MCP server held connected tabs and pending commands in memory without database access, so it could not verify session ownership or check whether an account allowed remote control. It also required a separate long-lived, single-instance server (plus a matching backend for every Vercel preview), and its shared contracts package split every command across a contract definition and a separate web handler.

## Decision

- `apps/web` serves both the MCP endpoint (`/api/mcp`) and the tab command routes (`/api/sessions/[id]/commands`) alongside its UI, so one Vercel deployment (including previews) contains everything an agent needs.
- Each command lives in one file under `features/agent/commands/`: its tool name, description, parameter and result schemas, and the tab handler. The MCP endpoint publishes every listed command as a tool. Command files import only schemas and types so they can load on the server; browser operations reach them through `CommandApp`.
- Every dispatch, tab attachment, and reply is authorized against the verified Clerk identity, session ownership, and the account's Remote Control setting. A session ID alone grants nothing. MCP accepts Clerk session tokens and OAuth access tokens and rejects anonymous requests.
- Redis relays commands, cancellations, replies, and a short-lived per-session lease naming the single tab connection allowed to receive commands. Redis stores no application state, and each Vercel deployment uses its own namespace.
- The browser tab remains the source of truth for live browser and track state; persistence stays with session autosave. Transport remains SSE for commands and HTTP for replies.

## Consequences

- Remote control and MCP require `REDIS_URL`; manual browsing and session saving do not.
- Every dispatch is time-bounded (including Redis waits), propagates cancellation to the tab, and fences cleanup behind the session lease so a stale connection cannot receive commands or release its replacement. Commands are never replayed.
- Lint keeps command definitions free of browser runtime imports and keeps Redis imports inside server modules. Adding a command takes one definition file and one entry in the command list.
