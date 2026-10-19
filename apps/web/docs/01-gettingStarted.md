# Getting started

Follow the [app README](../README.md#run-locally) to start PostgreSQL, Next.js, and optionally the MCP server. Local mock users need no Clerk keys or network calls to Clerk; sessions still use real PostgreSQL persistence and ownership checks. Open `/browser`, which shows the open session or an empty state, then use the sidebar to visit `/collections` and `/settings`.

The shared route layout composes `AppProviders`, `Workspace`, and route children. `AppProviders` composes the account-scoped session and remote-control providers. The session feature owns initialization and live browser and track stores; the agent feature owns the optional command connection. `Workspace` supplies the generic frame and persistent panel state. Each route renders its own content through `WorkspacePage`.

The open session and panel state survive client navigation within the shared layout. Page-local component state may reset when a route unmounts. A refresh restores the session in the URL from its last save in PostgreSQL. The tab asks for confirmation before closing with unsaved edits. Panel state resets on refresh. See [Sessions](../README.md#sessions) for persistence and configuration.

To add a route, follow [Pages and panels](02-guides/pages.md). For server configuration, MCP, and cloud deployment requirements, use the [app README](../README.md).

[Back to the docs home](README.md)
