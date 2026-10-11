# Web app glossary

Terms for the Next.js browser product and its generic workspace layout. The [project glossary](../../docs/glossary.md) covers browser and track terms.

## Application and session

### Workspace

The generic full-window layout in `components/workspace/`. It renders navigation and owns panel preferences and the theme. It does not import domain components or browser state.

### WorkspacePage

The route composition component. Each route supplies a title, optional subtitle and side panels, and center children. Domain components live beside their route's `page.tsx`.

### AppProviders

The shared client provider composition above routes. It owns browser-only initialization, the browser session, and the command relay connection.

### Browser session

The browser and track stores shared through `session/BrowserSession.tsx`. They survive client navigation within the shared layout. Refreshing creates a new in-memory session; saved sessions are not implemented.

### Product pages

The browser route at `/browser` has a session panel on the left and a disconnected agent placeholder on the right. Collections at `/collections` and settings at `/settings` have center content only. Settings is in the bottom sidebar group.

## Frame

### Frame

The layout every page shares: the side bar, left panel, center panel, and right panel, from left to right, each running the full window height, with the header floating over their tops. The frame owns layout and layout state; pages supply only content. This split is the workspace's main rule: a page never positions, sizes, or animates its panels, and the frame never knows what a page shows.

### Side bar

The narrow vertical bar of page links on the far left, running from the top of the window to the bottom. Pages in the bottom group, such as settings, sit at its bottom. The side bar is always visible.

### Header

A transparent bar floating over the top of the workspace. It holds the left panel toggle just right of the side bar, level with the first page icon, and the right panel toggle at the far right. It does not cover the side bar. Panels slide beneath it as they open, close, and resize, so its controls stay in place on every page. Only the toggles take pointer input.

### Title row

The top row of each panel, under the header: a side panel's title or the center panel's title. The rows share one height so their bottom borders form a single line. A row's content area is exactly the header's height, with its border drawn below, so title text and the header's toggles share one vertical center. Pages supply a side panel's title, not its title row.

**Toggle clearance** is the extra padding the frame adds to a title row that sits under a header toggle. The left panel's title row always clears the left toggle; when the left panel is collapsed, the center panel's title clear it instead. The right edge works the same way. When a toggle collapses or reopens a panel, the padding animates with it, so content slides out from under the toggle rather than jumping.

### Text trimming

The workspace theme trims `Typography` and tooltip text to its cap height and baseline with the CSS `text-box: trim-both cap alphabetic` property. A font's built-in space above and below its letters is uneven, so untrimmed text sits slightly high in whatever centers it. Render panel text through `Typography` to use the theme's typography and trimming. Frame title rows use an untrimmed 20-pixel line box for titles and subtitles so they align across browsers. For other internal UI elements, use the internal `textBoxTrim` style.

`text-box` applies only to the element that directly contains the text, and only when that element is a block or inline box; a flex container ignores it, and it is not inherited. Trimming also removes the line-height space that some components rely on for their height, so components sized by their text, such as tooltips, add padding back.

## Panels

### Center panel

The main content area between the side panels. Its title row shows the page title and optional subtitle. Every page has a center panel.

### Left panel

The side panel beside the side bar, usually navigation within the current page.

### Right panel

The side panel on the right edge, usually a tool that works alongside the page, such as an assistant.

### Absent and collapsed panels

A side panel is **absent** when the current page does not supply one, and **collapsed** when the page supplies one but the user has hidden it. Both close the panel. Only a collapsed panel has a toggle to reopen it.

### Side panel slot

The frame's position for one side panel, implemented by `SidePanelSlot`. The slot is open only when the page supplies a panel on that side and it is not collapsed. Widths live in the shared workspace preferences, so they survive route changes independently of panel content. Route-local panel content may unmount and reset its state.

Only the panel toggle animates a side panel. Changing pages swaps panels instantly, even when the new page opens or closes a side, so moving between pages never shows a panel sliding.

### Side panel state

Whether each side panel is collapsed, and its width. The preferences store inside `Workspace` owns each side's open state and width. Both carry across pages: a panel collapsed or resized on one page stays that way on the next page that has it.

### Panel toggle

The header button that collapses or reopens a side panel. `Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right when the current page supplies them. It renders only when the current page has a panel on that side, so pages never need to hide it themselves.

### Interior edge

The border of a side panel that faces the center panel. Drag it to resize the panel, or focus it and use the arrow keys, Home, and End. Double-click it to restore the default width. A collapsed panel stays mounted so its state, such as a message draft, survives being reopened.

## Navigation and routes

### Navigation entry

A sidebar link in `navigation.tsx` containing `href`, `label`, `icon`, and optional `placement`. Entries contain no page or panel components. Next.js owns routes, redirects, and unknown-route 404s.

### Route

A Next.js page selected by its URL. Each product route renders `WorkspacePage`. There is no central page registry or package page export. The [routing guide](docs/02-guides/routing.md) explains the persistent shared layout.
