# Workspace glossary

Terms for `@weng-lab/workspace`, a generic app frame: its layout, its page contract, and how apps plug into it. It knows nothing about genome browsing; the [gb app glossary](../local/glossary.md) covers the pages built on it.

## Workspace and shells

### Workspace

The `Workspace` component exported from `@weng-lab/workspace`: a template that draws the frame and the current page, plus the page types, theme, and `textBoxTrim` style. It has no router, storage, domain code, or Next.js imports. A lint rule keeps other `@weng-lab` packages and Next.js out of its source, so it can host any app.

### Shell

An app that renders the workspace and supplies everything specific to it as props: the page list, the current page ID, routing callbacks, and side bar footer content. `apps/local` is the gb app's shell. Passing these in, rather than having the workspace choose them, is what keeps the workspace reusable.

## Frame

### Frame

The layout every page shares: the side bar, left panel, center panel, and right panel, from left to right, each running the full window height, with the header floating over their tops. The frame owns layout and layout state; pages supply only content. This split is the workspace's main rule: a page never positions, sizes, or animates its panels, and the frame never knows what a page shows.

### Side bar

The narrow vertical bar of page links on the far left, running from the top of the window to the bottom. Pages in the bottom group, such as settings, sit at its bottom, followed by the shell's `sideBarFooter` content. It is always visible.

### Header

A transparent bar floating over the top of the workspace. It holds the left panel toggle just right of the side bar, level with the first page icon, and the right panel toggle at the far right. It does not cover the side bar. Panels slide beneath it as they open, close, and resize, so its controls stay in place on every page. Only the toggles take pointer input.

### Title row

The top row of each panel, under the header: a side panel's title or the center panel's breadcrumbs. The rows share one height so their bottom borders form a single line. A row's content area is exactly the header's height, with its border drawn below, so title text and the header's toggles share one vertical center. Pages supply a side panel's title, not its title row.

**Toggle clearance** is the extra padding the frame adds to a title row that sits under a header toggle. The left panel's title row always clears the left toggle; when the left panel is collapsed, the center panel's breadcrumbs clear it instead. The right edge works the same way. When a toggle collapses or reopens a panel, the padding animates with it, so content slides out from under the toggle rather than jumping.

### Text trimming

The workspace theme trims `Typography` and tooltip text to its cap height and baseline with the CSS `text-box: trim-both cap alphabetic` property. A font's built-in space above and below its letters is uneven, so untrimmed text sits slightly high in whatever centers it. Render panel text through `Typography` to use the theme's typography and trimming. Frame title rows use an untrimmed 20-pixel line box for titles and breadcrumbs so they align across browsers. For other elements, spread the exported `textBoxTrim` style.

`text-box` applies only to the element that directly contains the text, and only when that element is a block or inline box; a flex container ignores it, and it is not inherited. Trimming also removes the line-height space that some components rely on for their height, so components sized by their text, such as tooltips, add padding back.

## Panels

### Center panel

The main content area between the side panels. Its title row shows breadcrumbs, starting with the page label and followed by the page's title when it has one. Every page has a center panel.

### Left panel

The side panel beside the side bar, usually navigation within the current page.

### Right panel

The side panel on the right edge, usually a tool that works alongside the page, such as an assistant.

### Absent and collapsed panels

A side panel is **absent** when the current page does not supply one, and **collapsed** when the page supplies one but the user has hidden it. Both close the panel. Only a collapsed panel has a toggle to reopen it.

### Side panel slot

The frame's position for one side panel, implemented by `SidePanelSlot`. The slot stays mounted on every page and is open only when the page supplies a panel on that side and it is not collapsed. Keeping it mounted preserves the panel's width, and pages whose panels share the same content component keep that content's state when switching between them.

Only the panel toggle animates a side panel. Changing pages swaps panels instantly, even when the new page opens or closes a side, so moving between pages never shows a panel sliding.

### Side panel state

Whether each side panel is collapsed, and its width, held by `useSidePanel` in the workspace. It belongs to the frame rather than to any page, so it carries across pages: a panel collapsed or resized on one page stays that way on the next page that has it.

### Panel toggle

The header button that collapses or reopens a side panel. `Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right when the current page supplies them. It renders only when the current page has a panel on that side, so pages never need to hide it themselves.

### Interior edge

The border of a side panel that faces the center panel. Drag it to resize the panel, or focus it and use the arrow keys, Home, and End. Double-click it to restore the default width. A collapsed panel stays mounted so its state, such as a message draft, survives being reopened.

## Pages

### Page

One screen of an app, selected from the side bar. A page is a `WorkspacePage` definition with an ID, label, side bar icon, optional side bar group, and its panels:

```ts
panels: {
  center: { title?: ComponentType; content: ComponentType }; // required
  left?: { title: string; content: ComponentType };
  right?: { title: string; content: ComponentType };
}
```

A panel definition supplies content and a title only. Panels on the same page that need shared state share it through a store rather than through the frame.

### Page list

The pages a workspace shows, passed to `Workspace` as its `pages` prop in side bar order. The type requires at least one page, so the first page is always available as a fallback. The shell owns the list; the workspace ships no pages of its own. To add a page, write its definition in the shell and include it in the list.

### Page ID

The string that names a page, usually also its URL segment, so keep IDs stable, unique, and URL-safe. The workspace shows the page named by its `pageId` prop; an unknown or missing ID shows the first page.

### Page link

A side bar entry for a page: a real `<a href>` built by `getPageHref`, which defaults to `/${pageId}`. A plain click calls the shell's `navigate` with that URL, and hovering or focusing calls `prefetch`. Clicks with a modifier key, which open a new tab or window, are left to the browser, as are all clicks when the shell passes no `navigate`. The workspace never changes the URL itself; the shell's router does, then passes the new `pageId`. The [routing guide](docs/02-guides/routing.md) shows Next.js and TanStack Router setups.
