# Design system

This guide is for maintainers building app screens. `shared/ui/` holds the app's theme and the custom components screens are built from, so the app looks the same as features change. [Styling and text](styling.md) describes the theme itself.

## What lives here

| File               | Contents                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.ts`         | The MUI theme, with the palette and component overrides, and shared styles: `primarySurfaceSx`, `textBoxTrim`, `visuallyHidden`                     |
| `NavRail.tsx`      | The navy column of icon links: an optional brand, link groups separated by lines, bottom links, and a footer                                        |
| `StatusTag.tsx`    | A small bordered tag with a dot, or a spinner while busy, a label, and a neutral, success, warning, or error tone                                   |
| `ControlStrip.tsx` | `ControlStrip`, a row of control groups that wraps onto centered lines, and `ControlAction`, a labeled icon button for a group, such as Sort tracks |

Components take plain props and render presentation only. A feature or the workspace frame connects them to app state: the workspace's `SideBar` gives `NavRail` Next.js links and the current route, `SaveStatus` maps the session's save status to a `StatusTag`, and the browser view fills a `ControlStrip` with the toolbar sections from `@weng-lab/genomebrowser-ui`.

Lint keeps `shared/ui/` below everything else in the app. It must not import features, routes, composition, session or server code, the workspace frame, or `@weng-lab` packages. The workspace and features import from it.

## Deciding what goes here

Ask these in order; the first that applies decides.

1. **Does it only restyle an MUI component everywhere?** Add a theme override in `theme.ts` instead of a component, as for the paper cards of `LabeledGroup` and the borderless toggle buttons.
2. **Would other embedding sites, such as SCREEN, want it?** It belongs in `@weng-lab/genomebrowser-ui`, styled only from the host's theme. This folder holds the app's own look.
3. **Is it part of the workspace frame's layout,** such as panels, title rows, or the floating header? It belongs in `shared/workspace/`, built on components from here.
4. **Does it need app state,** such as the session, a browser store, the route, or the server? Split it: the look goes here with plain props, and a small component in the feature connects it to the state, as `StatusTag` and `SaveStatus` do. If it cannot be split, it stays in the feature.
5. **Does a second screen use it, or is one about to?** Move it here then. Until then, keep it in the feature that uses it. Pieces that set the app's overall look, such as the navigation rail, can come here first, since other screens follow them.

Name a component for what it looks like, not the feature that first used it: `StatusTag`, not `SaveBadge`. Every component here gets a gallery section showing each state screens use; a component that cannot be previewed without app state has not been split as step 4 describes.

## Preview

The design gallery shows the palette and every component here with the app theme, in the states screens use. It is a standalone Vite page, separate from Next.js, so it needs no sign-in, database, or session. From the repository root:

```sh
pnpm web design
```

Then open `http://localhost:3100`. The gallery is `apps/web/design/Gallery.tsx`. Add a section there when you add a component, showing each state a screen uses.

[Back to the docs home](../README.md)
