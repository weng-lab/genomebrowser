# Workspace components

These components are internal to `apps/web`, not a published package API. The shared layout composes `AppProviders`, `Workspace`, and route children.

## `AppProviders`

Mounts `SessionProvider` and `RemoteControlProvider` for the signed-in account; changing accounts remounts both. `AccountControls` signs out or switches users only after `close` saves or discards the open session. `SessionProvider` owns saved sessions and the open session for the workspace's lifetime, and opens the session named in the URL. Read it with `useSession(selector)`, which returns `status`, `sessions`, `active` (the open session's ID, name, and stores), `saveStatus`, `pending`, `error`, and the operations `open`, `create`, `copy`, `rename`, `remove`, and `close`. `useRemoteControl()` exposes the connection state and the Settings toggle. See [Sessions](../README.md#sessions) for the contract.

## `Workspace`

Renders the generic full-window frame, theme, sidebar navigation, and panel controls. It receives navigation entries, children, and optional `brand` and `footer` slots. The brand sits at the top of the side bar, above the navigation, with a line below it; composition supplies a logo placeholder there. Composition supplies account controls through the footer slot, keeping domain imports out of the workspace. Navigation is `{ sections, bottom }`: `sections` lists groups of entries from the top, in order, with a line between groups, and the optional `bottom` lists entries at the bottom of the side bar. Each entry contains `href`, a unique `label`, and `icon`, and no domain components. An entry's optional `panel` names the id of a left panel that the page at `href` supplies. On that page the entry is a button that controls `left-panel`: it shows its panel, opening the left side, or hides the left side while its panel is shown, and it is highlighted only while its panel is shown. Elsewhere it is a link that goes to `href` with its panel shown, unless a modifier key opens the link elsewhere. Until an entry chooses one, a page shows its first left panel, so list that panel's entry first.

## `WorkspacePage`

Routes compose their content with this component:

```ts
type WorkspacePageProps = {
  title: string;
  subtitle?: ReactNode;
  heading?: ReactNode;
  left?: WorkspacePanel | readonly WorkspacePanel[];
  right?: WorkspacePanel;
  children: ReactNode;
};
type WorkspacePanel = { id?: string; title: string; icon?: ReactNode; children: ReactNode };
```

`title` names the center panel; `subtitle` adds optional title content. `heading` replaces the center title row's breadcrumbs at its left end and must render the page's own `h1`; the browser uses it for the session switcher, which stays there whether or not the left panel is open. `left` and `right` supply side-panel titles and elements. `left` may be a list of panels with ids, which navigation entries choose between; the left side shows the chosen one, or the first. Each side panel shows its title in its navy title row; the browser's left panels are **Genome Browser**, which lists saved regions under a **Regions** label, and **Sessions**. The right panel's title and `icon` label its button at the right end of the center title row; the browser's is **AI Assist** with a sparkle. When the page also supplies `actions`, a vertical line separates them from the button. Omit a side to remove its panel and toggle. `children` supplies center content. The generic shell determines layout, sizing, and animation.

## Side panel behavior

| Side  | Default width | Minimum | Maximum |
| ----- | ------------- | ------- | ------- |
| Left  | 300 px        | 180 px  | 480 px  |
| Right | 360 px        | 280 px  | 720 px  |

`Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right when supplied by the current route. Shortcuts ignore text-entry fields and editable content and fire once per key press. They use Control on every platform.

Drag a panel's interior edge to resize it. With the edge focused, Left and Right arrow keys resize it by 16 pixels, Home sets the minimum, and End sets the maximum. Double-click restores the default width.

The left panel's toggle floats at the top left and hides or shows whichever left panel is chosen. The right panel's button stays in the center title row and is highlighted while the panel is open; the panel's close button also hides it. Panels collapse and reopen with a short width animation; reduced-motion settings disable it. Route changes update panels instantly. A collapsed panel keeps its current content mounted but inert and hidden from assistive technology. Route navigation can unmount that content. Widths and collapsed state last for the shared workspace mount and are not saved across refreshes.

Panel toggles reference `left-panel` and `right-panel` with `aria-controls`. Render one workspace per document.

[Back to the docs home](README.md)
