# Routing

The app's router owns the URL. The workspace reads the current page from `pageId` and renders each side bar entry as a link to that page's URL. A plain click calls the app's `navigate`, and hovering or focusing a link calls `prefetch`. Because the entries are real links, opening a page in a new tab and copying its address work with any router.

| Prop          | Purpose                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `pageId`      | The current page's ID from the router. Missing or unknown shows the first page. |
| `getPageHref` | Builds a page's URL. Defaults to `/${pageId}`.                                  |
| `navigate`    | Client-side navigation to a URL from `getPageHref`.                             |
| `prefetch`    | Preloads a page's URL when its link is hovered or focused.                      |

Without `navigate`, links load their URL normally. Clicks with a modifier key, which open a new tab or window, always go to the browser. A plain left click on the current page's link does nothing.

Render the workspace where it stays mounted as the page changes, usually a layout. Panel widths and collapsed sides live in the workspace, so remounting it on every page change resets them.

## Next.js App Router

Render the workspace from a client component inside a layout, and read the page from the segment below that layout with `useSelectedLayoutSegment`. Define `pages` in a client module as well: page definitions contain components, which a Server Component cannot pass to a Client Component.

```tsx
// app/(workspace)/WorkspaceShell.tsx
"use client";

import { Workspace } from "@weng-lab/workspace";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { pages } from "./pages";

export function WorkspaceShell() {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  return (
    <Workspace
      pages={pages}
      pageId={segment ?? undefined}
      navigate={(href) => router.push(href)}
      prefetch={(href) => router.prefetch(href)}
    />
  );
}
```

Render `<WorkspaceShell />` from `app/(workspace)/layout.tsx`. Give each page a route so its URL resolves, such as `app/(workspace)/[page]/page.tsx` returning `null`. Wrap the app in MUI's `AppRouterCacheProvider` as for any MUI app, and add `@weng-lab/workspace` to `transpilePackages`.

## TanStack Router

Read the page from a route param and pass the router's `navigate` and `preloadRoute`:

```tsx
// src/routes/$page.tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Workspace } from "@weng-lab/workspace";
import { pages } from "../pages";

export const Route = createFileRoute("/$page")({ component: WorkspaceRoute });

function WorkspaceRoute() {
  const router = useRouter();
  const { page } = Route.useParams();
  return (
    <Workspace
      pages={pages}
      pageId={page}
      navigate={(href) => router.navigate({ to: href })}
      prefetch={(href) => router.preloadRoute({ to: href })}
    />
  );
}
```

TanStack Router keeps the route component mounted when only its param changes, so moving between pages keeps the workspace's panel state.

## Plain browser history

Apps without a router can read the first path segment with `useSyncExternalStore` and navigate with `history.pushState`. [Getting started](../01-gettingStarted.md#connect-the-url) shows the complete version, which `apps/local` also uses.

## Under a base path

When the workspace lives under a prefix, build URLs with `getPageHref` and read the segment after the prefix:

```tsx
<Workspace pages={pages} pageId={segment} getPageHref={(id) => `/app/${id}`} navigate={navigate} />
```

## Deeper routes

The workspace routes only between pages. Routes within a page, such as `/reports/42`, belong to the app. Panel content reads them with the router's own hooks, and the page's link still points at the page itself. A plain left click on the current page's link leaves the deeper URL unchanged; it does not return to the page's root route.

[Back to the docs home](../README.md)
