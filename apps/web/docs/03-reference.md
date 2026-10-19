# Workspace components

These components are internal to `apps/web`, not a published package API. The shared layout composes `AppProviders`, `Workspace`, and route children.

## `AppProviders`

Mounts `SessionProvider` and `RemoteControlProvider` for the signed-in account; changing accounts remounts both. `AccountControls` signs out or switches users only after `close` saves or discards the open session. `SessionProvider` owns saved sessions and the open session for the workspace's lifetime, and opens the session named in the URL. Read it with `useSession(selector)`, which returns `status`, `sessions`, `active` (the open session's ID, name, and stores), `saveStatus`, `pending`, `error`, and the operations `open`, `create`, `rename`, `remove`, and `close`. `useRemoteControl()` exposes the connection state and the Settings toggle. See [Sessions](../README.md#sessions) for the contract.

## `Workspace`

Renders the generic full-window frame, theme, sidebar navigation, and panel controls. It receives navigation entries and children. Navigation entries contain `href`, `label`, `icon`, and optional `placement` of `top` or `bottom`. They contain no domain components or panel metadata.

## `WorkspacePage`

Routes compose their content with this component:

```ts
type WorkspacePageProps = {
  title: string;
  subtitle?: ReactNode;
  left?: { title: string; children: ReactNode };
  right?: { title: string; children: ReactNode };
  children: ReactNode;
};
```

`title` names the center panel; `subtitle` adds optional title content. `left` and `right` supply side-panel titles and elements. Omit a side to remove its panel and toggle. `children` supplies center content. The generic shell determines layout, sizing, and animation.

## Side panel behavior

| Side  | Default width | Minimum | Maximum |
| ----- | ------------- | ------- | ------- |
| Left  | 240 px        | 180 px  | 480 px  |
| Right | 360 px        | 280 px  | 720 px  |

`Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right when supplied by the current route. Shortcuts ignore text-entry fields and editable content and fire once per key press. They use Control on every platform.

Drag a panel's interior edge to resize it. With the edge focused, Left and Right arrow keys resize it by 16 pixels, Home sets the minimum, and End sets the maximum. Double-click restores the default width.

Header toggles collapse and reopen panels with a short width animation; reduced-motion settings disable it. Route changes update panels instantly. A collapsed panel keeps its current content mounted but inert and hidden from assistive technology. Route navigation can unmount that content. Widths and collapsed state last for the shared workspace mount and are not saved across refreshes.

Panel toggles reference `left-panel` and `right-panel` with `aria-controls`. Render one workspace per document.

[Back to the docs home](README.md)
