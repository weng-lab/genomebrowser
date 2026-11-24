# Design system

This guide is for maintainers building app screens. `shared/ui/` holds the app's theme and the custom components screens are built from, so the app looks the same as features change. [Styling and text](styling.md) describes the theme itself.

## What lives here

`theme.ts` holds the MUI theme and the shared styles that go with it, `color.ts` the colors color controls offer, and each other file a component. This guide doesn't list them: list the folder, or open Storybook, below. Each component's doc comment says what it is and what it does, and, where two are alike, which to use instead, such as `EmptyState` for an empty list and `StatusMessage` while it loads.

Components take plain props and render presentation only. A feature or the workspace frame connects them to app state: the workspace's `SideBar` gives `NavRail` Next.js links and the current route, `SaveStatus` maps the session's save status to a `StatusTag`, and the theme styles the browser toolbar, the UI package's `ControlToolbar`, through its `GbControlToolbar` and `GbLabeledGroup` entries.

Lint keeps `shared/ui/` below everything else in the app. It must not import features, routes, composition, session or server code, the workspace frame, or `@weng-lab` packages. The workspace and features import from it.

## Compose screens from these components

Build a feature's interface from these components and the theme, not from restyled MUI parts. A feature's components connect state to these; they don't redraw a button, field, form, dialog, menu, or message the app already has. When a screen needs one of these and it doesn't exist yet, add it here first, with stories, then build the feature on it. Copying a dialog's layout or a button's `sx` into a feature, even once, is how screens drift apart.

Before building a piece of interface, look here for one that fits: list the folder, read the doc comments, and step through Storybook.

Signs a feature is rebuilding one of these: it imports `Dialog`, `DialogActions`, `Menu`, or `Popover` from MUI, or it imports a shared style such as `formButtonSx` to make its own button look like one here. Use the component instead, or, if it doesn't fit, change or add one here so every screen gets the change.

## Deciding what goes here

Ask these in order; the first that applies decides.

1. **Does it only restyle an MUI component everywhere?** Add a theme override in `theme.ts` instead of a component, as for the paper cards of `LabeledGroup` and the borderless toggle buttons.
2. **Would other embedding sites, such as SCREEN, want it?** It belongs in `@weng-lab/genomebrowser-ui`, styled only from the host's theme. This folder holds the app's own look.
3. **Is it part of the workspace frame's layout,** such as panels, title rows, or the floating header? It belongs in `shared/workspace/`, built on components from here.
4. **Does it need app state,** such as the session, a browser store, the route, or the server? Split it: the look goes here with plain props, and a small component in the feature connects it to the state, as `StatusTag` and `SaveStatus` do. If it cannot be split, it stays in the feature.
5. **Is it a basic building block,** such as a button style, field, form layout, dialog, menu, message, or a way to show a color? It comes here from its first use, as the section above describes, since other screens will need it.
6. **Is it a larger piece made of these, such as a card for one kind of item?** Keep it in the feature until a second screen uses it, or one is about to, then move it here. Pieces that set the app's overall look, such as the navigation rail, can come here first, since other screens follow them.

Name a component for what it looks like, not the feature that first used it: `StatusTag`, not `SaveBadge`. Give it a doc comment saying what it is and what it does, and, if it resembles another component here, when to use which; that comment, not this guide, is where it is described. Every component here gets stories showing each state screens use; a component that cannot be previewed without app state has not been split as step 4 describes.

## Preview

Storybook shows the palette and every component here with the app theme, in the states screens use. It runs on its own, separate from Next.js, so it needs no sign-in, database, or session. From the repository root:

```sh
pnpm web storybook
```

Then open `http://localhost:6006`. Its configuration is in `apps/web/.storybook/`, which applies the app theme to every story.

When you add a component, add `<Component>.stories.tsx` beside it with a story for each state a screen uses. Stories in `shared/ui/` follow its import rules, so they use sample data rather than the app's navigation or `@weng-lab` packages. Stories that show the app's own pieces, such as the browser toolbar from the UI package styled by the theme, live in `apps/web/design/`.

`pnpm web storybook:build` builds a static copy in `apps/web/storybook-static/`, which Git ignores.

[Back to the docs home](../README.md)
