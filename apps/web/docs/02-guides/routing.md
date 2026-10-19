# Routing

Next.js owns URLs, route rendering, redirects, and 404s. The root route redirects to `/browser`, which redirects to the open session, or shows the empty browser when none is open. Each session's browser is at `/browser/[sessionId]`, using the session's UUID. Malformed IDs return the not-found page; a valid UUID for a missing or inaccessible session produces the session-load error UI. Browser, collections, and settings have concrete route files under `app/(workspace)/`.

`SessionProvider` reads `sessionId` from the URL with `useParams` and opens that session, whether the URL was typed, linked, or reached through history. Panel links are ordinary links to session URLs. When opening succeeds, fails, or the open session is deleted, the session owner replaces a `/browser` URL with the session that is actually open. On pages without a session, such as Settings, the open session, its stores, and remote control stay alive. Components read the open session with `useSession`.

The shared `app/(workspace)/layout.tsx` wraps children in `AppProviders`, then `Workspace` with the app's navigation list. Keep this composition above route pages so the open session, the command connection, and panel state survive client navigation.

Navigation entries in `composition/navigation.tsx` contain `href`, `label`, `icon`, and optional `placement`. The generic sidebar uses Next.js links and the pathname to select the active entry. It does not choose page components or side panels. Each route uses `WorkspacePage` to supply its title, subtitle, panel elements, and center children.

Pages are server components by default and can fetch data on the server. The `/browser` index is a client component so it can redirect to the session currently open in the workspace. Interactive domain components declare `"use client"`. Stores exist only in the browser, after a session loads, so the server renders the browser page without them. The browser view waits for the session to load and restore. With Clerk, the workspace shows `WorkspaceSkeleton` until Clerk reports the signed-in user.

A page's local state may reset when its route unmounts. Refreshing creates new stores and restores the session named in the URL from its last save. Panel widths and collapsed state reset. See [Sessions](../../README.md#sessions) for save timing and multi-tab limits.

Deeper URLs belong to ordinary Next.js routes. Add their route files and choose the navigation link appropriate for that section; no page ID or central registry is needed.

[Back to the docs home](../README.md)
