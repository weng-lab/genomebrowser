# Getting started

Follow the [app README](../README.md#run-locally) to start Next.js and the persistent browser server. Open `/browser`, which redirects to the default `local` session, then use the sidebar to visit `/collections` and `/settings`.

The shared route layout composes `AppProviders`, `Workspace`, and route children. `AppProviders` owns browser-only initialization, browser and track stores, and the command connection. `Workspace` supplies the generic frame and persistent panel state. Each route renders its own content through `WorkspacePage`.

Browser stores and panel state survive client navigation within the shared layout. Page-local component state may reset when a route unmounts. A refresh restores the last shared hg38 session saved in SQLite. Wait for Saved at the top left of the browser center panel before refreshing or closing. Panel state resets on refresh. User authentication, conflict resolution, ACP, and Eve integrations are not implemented. See [Shared session](../README.md#shared-session) for persistence and configuration.

To add a route, follow [Pages and panels](02-guides/pages.md). For server configuration, MCP, and cloud deployment requirements, use the [app README](../README.md).

[Back to the docs home](README.md)
