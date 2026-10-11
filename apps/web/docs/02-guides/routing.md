# Routing

Next.js owns URLs, route rendering, redirects, and 404s. The root route redirects to `/browser`. Browser, collections, and settings have concrete route files under `app/(workspace)/`.

The shared `app/(workspace)/layout.tsx` wraps children in `AppProviders`, then `Workspace` with the app's navigation list. Keep this composition above route pages so browser stores, the command connection, and panel preferences survive client navigation.

Navigation entries in `navigation.tsx` contain `href`, `label`, `icon`, and optional `placement`. The generic sidebar uses Next.js links and the pathname to select the active entry. It does not choose page components or side panels. Each route uses `WorkspacePage` to supply its title, subtitle, panel elements, and center children.

Pages remain normal server components and can fetch data on the server. Interactive domain components declare `"use client"`. Currently `AppProviders` loads the browser session provider with `ssr: false`, so the initial workspace HTML shows a loading message until client initialization finishes. This preserves the existing browser-only startup behavior; server page output still passes through the provider as React children.

A page's local state may reset when its route unmounts. Refreshing also resets the in-memory browser session and reconnects the relay with a new connection ID. There is no session persistence across refreshes.

Deeper URLs belong to ordinary Next.js routes. Add their route files and choose the navigation link appropriate for that section; no page ID or central registry is needed.

[Back to the docs home](../README.md)
