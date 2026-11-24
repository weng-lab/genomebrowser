# Design system

This guide is for maintainers building app screens. `shared/ui/` holds the app's theme and the custom components screens are built from, so the app looks the same as features change. [Styling and text](styling.md) describes the theme itself.

## What lives here

| File                    | Contents                                                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.ts`              | The MUI theme, with the palette and component overrides, including the toolbar's centering, cards, and toggle buttons, and shared styles: `primarySurfaceSx`, `textBoxTrim`, `visuallyHidden` |
| `color.ts`              | `swatchColors`, the eight named colors color rows offer, and the six-digit hex helpers that check and read typed and stored colors                                                            |
| `NavRail.tsx`           | The navy column of icon links: an optional brand, link groups separated by lines, bottom links, and a footer                                                                                  |
| `StatusTag.tsx`         | A small bordered tag with a dot, or a spinner while busy, a label, and a neutral, success, warning, or error tone                                                                             |
| `SectionHeader.tsx`     | A panel section's heading, with an optional count and icon buttons at its right end, such as the regions panel's Add region                                                                   |
| `SectionLabel.tsx`      | Bold gray capitals above a list, lined up with its rows' text, such as Recent in the session menu                                                                                             |
| `EmptyState.tsx`        | A dashed placeholder, with a title and what to do, where a list or section has nothing yet                                                                                                    |
| `StatusMessage.tsx`     | A quiet line, or an error, where content would be while it loads, fails, or waits for a session, with an optional action such as Try again                                                    |
| `ColorDot.tsx`          | A color as a small dot: filled, a ring, faded, or a dotted ring for no color                                                                                                                  |
| `SwatchPicker.tsx`      | A row of round color swatches that works as a radio group, with optional no color and custom color options                                                                                    |
| `ColorPicker.tsx`       | Picks any color from an area, a hue bar, and a hex field; `ColorPickerPopover` opens it from a custom color button                                                                            |
| `MoreActionsButton.tsx` | The more-actions (⋮) button that both action popups below open from                                                                                                                           |
| `ActionMenu.tsx`        | A ⋮ button and its menu of `MenuAction`s, each an icon and a label, red for deleting                                                                                                          |
| `ActionsPopover.tsx`    | A ⋮ button and a popover that holds fields as well as menu items, such as a region's name and color                                                                                           |
| `NameAndColor.tsx`      | The top of an actions popover: a name field and a color row, which apply as they change                                                                                                       |
| `FormCard.tsx`          | A short form on a bordered card set into a panel, with `FormCardActions` for its submit and Cancel buttons                                                                                    |
| `DialogForm.tsx`        | A dialog's content as a form: a title, stacked fields, Cancel, and a filled submit button. `dialogLayout.ts` holds the spacing other dialogs share                                            |
| `ConfirmDialog.tsx`     | Asks before an action, with a red confirm button for ones that cannot be undone and room for more choices                                                                                     |

Components take plain props and render presentation only. A feature or the workspace frame connects them to app state: the workspace's `SideBar` gives `NavRail` Next.js links and the current route, `SaveStatus` maps the session's save status to a `StatusTag`, and the theme styles the browser toolbar, the UI package's `ControlToolbar`, through its `GbControlToolbar` and `GbLabeledGroup` entries.

Lint keeps `shared/ui/` below everything else in the app. It must not import features, routes, composition, session or server code, the workspace frame, or `@weng-lab` packages. The workspace and features import from it.

## Compose screens from these components

Build a feature's interface from these components and the theme, not from restyled MUI parts. A feature's components connect state to these; they don't redraw a button, field, form, dialog, menu, or message the app already has. When a screen needs one of these and it doesn't exist yet, add it here first, with stories, then build the feature on it. Copying a dialog's layout or a button's `sx` into a feature, even once, is how screens drift apart.

| A screen needs                                         | Use                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| A form in a dialog                                     | `DialogForm` inside a MUI `Dialog`                                      |
| To ask before an action, such as a delete              | `ConfirmDialog`, with `tone="danger"` for one that can't be undone      |
| A short form set into a panel                          | `FormCard` and `FormCardActions`                                        |
| A row's actions                                        | `ActionMenu` and `MenuAction`; `ActionsPopover` when it also has fields |
| A section's heading, with a count or add buttons       | `SectionHeader`                                                         |
| A small label above a list in a menu or page           | `SectionLabel`                                                          |
| A list or section with nothing in it yet               | `EmptyState`                                                            |
| Loading, a failure, or a wait for a session, in a line | `StatusMessage`                                                         |
| A save state or other short status                     | `StatusTag`                                                             |
| A color shown, or chosen                               | `ColorDot`; `SwatchPicker`, which opens `ColorPicker` for any color     |

Signs a feature is rebuilding one of these: it imports `Dialog`, `DialogActions`, `Menu`, or `Popover` from MUI, or it imports a shared style such as `formButtonSx` to make its own button look like one here. Use the component instead, or, if it doesn't fit, change or add one here so every screen gets the change.

## Deciding what goes here

Ask these in order; the first that applies decides.

1. **Does it only restyle an MUI component everywhere?** Add a theme override in `theme.ts` instead of a component, as for the paper cards of `LabeledGroup` and the borderless toggle buttons.
2. **Would other embedding sites, such as SCREEN, want it?** It belongs in `@weng-lab/genomebrowser-ui`, styled only from the host's theme. This folder holds the app's own look.
3. **Is it part of the workspace frame's layout,** such as panels, title rows, or the floating header? It belongs in `shared/workspace/`, built on components from here.
4. **Does it need app state,** such as the session, a browser store, the route, or the server? Split it: the look goes here with plain props, and a small component in the feature connects it to the state, as `StatusTag` and `SaveStatus` do. If it cannot be split, it stays in the feature.
5. **Is it a basic building block,** such as a button style, field, form layout, dialog, menu, message, or a way to show a color? It comes here from its first use, as the section above describes, since other screens will need it.
6. **Is it a larger piece made of these, such as a card for one kind of item?** Keep it in the feature until a second screen uses it, or one is about to, then move it here. Pieces that set the app's overall look, such as the navigation rail, can come here first, since other screens follow them.

Name a component for what it looks like, not the feature that first used it: `StatusTag`, not `SaveBadge`. Every component here gets stories showing each state screens use; a component that cannot be previewed without app state has not been split as step 4 describes.

## Preview

Storybook shows the palette and every component here with the app theme, in the states screens use. It runs on its own, separate from Next.js, so it needs no sign-in, database, or session. From the repository root:

```sh
pnpm web storybook
```

Then open `http://localhost:6006`. Its configuration is in `apps/web/.storybook/`, which applies the app theme to every story.

When you add a component, add `<Component>.stories.tsx` beside it with a story for each state a screen uses. Stories in `shared/ui/` follow its import rules, so they use sample data rather than the app's navigation or `@weng-lab` packages. Stories that show the app's own pieces, such as the browser toolbar from the UI package styled by the theme, live in `apps/web/design/`.

`pnpm web storybook:build` builds a static copy in `apps/web/storybook-static/`, which Git ignores.

[Back to the docs home](../README.md)
