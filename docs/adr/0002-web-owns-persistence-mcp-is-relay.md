# ADR 0002: Web owns persistence; MCP is a relay

- Status: accepted
- Date: 2026-10-29 (codified from existing docs)

## Context

Agents need to drive a live browser tab. Sessions must persist for signed-in users. Coupling agent transport to the database would force the MCP process to understand accounts and snapshots.

## Decision

- `apps/web` owns authentication-derived identity, PostgreSQL sessions, and command handlers against live stores.
- `apps/server` (`@weng-lab/mcp`) exposes MCP tools and delivers commands over SSE to a connected tab. It stores nothing durable and has no database.
- UI and agent paths mutate the same browser/track stores in the tab.
- Manual browsing must work when MCP is off or unavailable.

## Consequences

Cloud MCP needs auth/authorization and careful single-instance/SSE operational limits (see [product limitations](../product/limitations.md)). Adding session queries to the MCP server would violate this split. New agent commands add a contract + web handler; the server registers tools from contracts without knowing persistence.
