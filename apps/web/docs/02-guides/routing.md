# Routing

Next.js owns URLs, route rendering, redirects, and 404s. The root route redirects to `/browser`. Browser, collections, and settings have concrete route files under `app/(workspace)/`.

The shared `app/(workspace)/layout.tsx` wraps children in `AppProviders`, then `Workspace` with the app's navigation list. Keep this composition above route pages so browser stores, the command connection, and panel state survive client navigation.

Navigation entries in `app/(workspace)/navigation.tsx` contain `href`, `label`, `icon`, and optional `placement`. The generic sidebar uses Next.js links and the pathname to select the active entry. It does not choose page components or side panels. Each route uses `WorkspacePage` to supply its title, subtitle, panel elements, and center children.

Pages remain normal server components and can fetch data on the server. Interactive domain components declare `"use client"`. Currently `AppProviders` loads the browser session provider with `ssr: false`, so the initial workspace HTML shows `WorkspaceSkeleton` until client initialization finishes. Server page output still passes through the provider as React children. The browser view waits for the initial relay handshake to restore the saved session.

A page's local state may reset when its route unmounts. Refreshing creates new stores, reconnects with a new connection ID, and restores the last saved shared session. Panel widths and collapsed state reset. Reconnection within the existing mount preserves the local browser session. See [Shared session](../../README.md#shared-session) for save timing and multi-tab limits.

Deeper URLs belong to ordinary Next.js routes. Add their route files and choose the navigation link appropriate for that section; no page ID or central registry is needed.

[Back to the docs home](../README.md)
