# Reference

## Exports

| Export                                                   | Kind      | Purpose                                                    |
| -------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| [`Workspace`](#workspace)                                | Component | Renders the frame and the current page.                    |
| [`WorkspaceProps`](#workspace)                           | Type      | Props for `Workspace`.                                     |
| [`WorkspacePage`](#workspacepage)                        | Type      | One page definition.                                       |
| [`WorkspacePages`](#workspacepages)                      | Type      | A non-empty list of pages.                                 |
| [`CenterPanel`, `SidePanel`](#centerpanel-and-sidepanel) | Types     | Panel definitions within a page.                           |
| [`theme`](02-guides/styling.md#the-theme)                | MUI theme | The theme `Workspace` applies.                             |
| [`textBoxTrim`](02-guides/styling.md#text-trimming)      | Style     | `{ textBox: "trim-both cap alphabetic" }` for custom text. |

## `Workspace`

Renders the side bar, the current page's panels, and the header with the panel toggles. It fills the window (`100dvh`), applies the workspace theme and MUI's `CssBaseline`, and is a client component.

| Prop            | Type                         | Default                | Description                                                                 |
| --------------- | ---------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `pages`         | `WorkspacePages`             | Required               | Pages in side bar order.                                                    |
| `pageId`        | `string \| undefined`        | Required               | The current page's ID. Missing or unknown shows the first page.             |
| `getPageHref`   | `(pageId: string) => string` | `` (id) => `/${id}` `` | Builds the URL for each side bar link.                                      |
| `navigate`      | `(href: string) => void`     | None                   | Called with a link's URL on a plain click. Without it, links load normally. |
| `prefetch`      | `(href: string) => void`     | None                   | Called with a link's URL when the link is hovered or focused.               |
| `sideBarFooter` | `ReactNode`                  | None                   | Rendered at the bottom of the side bar, below the bottom-group pages.       |

The workspace never changes the URL itself. Clicks with a modifier key and clicks on links with a `target` are left to the browser, and a plain left click on the current page's link does nothing. See [Routing](02-guides/routing.md) for router setups.

The side panels have the element IDs `left-panel` and `right-panel`, which their toggles reference with `aria-controls`. Render one workspace per document.

## `WorkspacePage`

| Field       | Type                                                           | Description                                                                             |
| ----------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `id`        | `string`                                                       | Names the page and usually forms its URL segment. Keep it stable, unique, and URL-safe. |
| `label`     | `string`                                                       | The side bar link's accessible name and tooltip, and the first breadcrumb.              |
| `icon`      | `ReactNode`                                                    | The side bar icon.                                                                      |
| `placement` | `"top" \| "bottom"`                                            | The side bar group. Defaults to `"top"`.                                                |
| `panels`    | `{ center: CenterPanel; left?: SidePanel; right?: SidePanel }` | The page's panels. Only `center` is required.                                           |

## `WorkspacePages`

`readonly [WorkspacePage, ...WorkspacePage[]]`. The type requires at least one page so the first page can always serve as the fallback.

## `CenterPanel` and `SidePanel`

| Type          | Field     | Type            | Description                                                 |
| ------------- | --------- | --------------- | ----------------------------------------------------------- |
| `CenterPanel` | `title`   | `ComponentType` | Optional. Rendered in the breadcrumbs after the page label. |
| `CenterPanel` | `content` | `ComponentType` | The center panel's content.                                 |
| `SidePanel`   | `title`   | `string`        | Shown in the panel's title row.                             |
| `SidePanel`   | `content` | `ComponentType` | The panel's content, below its title row.                   |

Content and title components receive no props. See [Pages and panels](02-guides/pages.md) for sharing state between them.

## Side panel behavior

| Side  | Default width | Minimum | Maximum |
| ----- | ------------- | ------- | ------- |
| Left  | 240 px        | 180 px  | 480 px  |
| Right | 360 px        | 280 px  | 720 px  |

The workspace registers `Ctrl+B` to toggle the left panel and `Ctrl+Alt+B` to toggle the right. A shortcut is enabled only when the current page supplies that panel. It ignores text-entry fields and editable content, fires once per key press, and prevents the browser's default action when handled. Bindings use Control on every platform. No hotkey provider is required in the consumer.

Dragging a panel's interior edge resizes it. With the edge focused, Left and Right arrow keys resize it by 16 pixels, Home sets the minimum, and End sets the maximum. Double-clicking the edge restores the default width.

The header toggles collapse and reopen panels with a short width animation, which reduced-motion settings turn off. Changing pages opens or closes panels instantly. A collapsed panel keeps its content mounted but is inert and hidden from assistive technology. When a page does not supply that panel, its slot stays mounted and its content unmounts. Widths and collapsed sides last until the workspace unmounts.

[Back to the docs home](README.md)
