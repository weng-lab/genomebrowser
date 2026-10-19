# Web app glossary

Terms for the Next.js browser product, browser server, and generic workspace layout. The [project glossary](../../docs/glossary.md) covers browser and track terms.

## Application and session

### Workspace

The generic full-window layout in `components/workspace/`. It renders navigation and owns panel state and the theme. It does not import domain components or browser state.

### WorkspacePage

The route composition component. Each route supplies a title, optional subtitle and side panels, and center children. Domain components live beside their route's `page.tsx`.

### AppProviders

The shared client provider composition above routes. It owns browser-only initialization, the browser session, and `BrowserServer`, which saves the session and runs remote control.

### Browser session

The live browser and track stores shared through `browser/BrowserSession.tsx`. They survive client navigation within the shared layout. A session snapshot is the serializable form used for saving and restoration. See [Shared session](README.md#shared-session) for persistence behavior.

### Product pages

The browser route at `/browser/[sessionId]` has a Sessions panel on the left and an Agent panel on the right. The Agent panel shows whether this tab accepts remote commands. Collections at `/collections` and settings at `/settings` have center content only. Settings is in the bottom sidebar group.

## Commands and persistence

### Browser server

The persistent Hono server in `apps/server`. It loads and saves sessions through a session repository, exposes browser commands to agents over MCP, and sends each command to the tab that has the session open over server-sent events, or SSE. It does not fetch genomic track files or own the live browser stores. Next.js rewrites `/api/*` and `/mcp` to it.

### Remote control

A tab's SSE stream for one session, opened at `/api/sessions/:id/rpc`. Only the first tab to connect receives the session's commands; later tabs are rejected and retry until it disconnects. It is on by default and can be turned off in Settings. Saving does not depend on it.

### Local access

The web app and server run on loopback without tokens or login. Host and origin checks restrict browser access to the local setup. Any local caller can control a connected tab or save a session. Account authentication and ownership checks are future work.

### Command and reply

A command requests a browser-store action. Each command is one file in `apps/server/src/commands/` that defines its name, description, parameters, and the store action it runs. The registry in `commands/index.ts` makes each one an MCP tool of the same name. The implemented command is `set_region`. Each delivered command has a `commandId` and an `expiresAt` deadline. The tab's reply is the whole session snapshot on success, or the store's failure. Success means applied to the store, not finished loading track data or saved to the database.

A **pending command** has been sent to a tab and is waiting for its reply. The per-tab pending-command tracker owns timeout, cancellation, and completion cleanup. Pending commands live in memory and are not replayed.

### Session snapshot

The versioned JSON representation of browser settings, region, highlights, selection settings, track configurations and order, source ownership, and pinned track IDs. It excludes fetched data, loading state, resources, module implementations, and functions. Its schema lives in `@weng-lab/session-snapshot`, and `browser.assembly` is the session's only assembly value. A **session** is a snapshot saved in SQLite under a session ID. The URL `/browser/[sessionId]` selects it; `local` is the default until there is a session picker. Every tab with the session open saves to it; the last save wins, and tabs do not receive each other's edits.

### Session repository

The server's injected `SessionRepository`, with asynchronous `load(id)` and `save(id, snapshot)` operations. SQLite is the current implementation.

### Save status

The client indicator at the top left of the browser center panel. It reports restoration, saving, successful persistence, or failure and retry. A command reply and save completion are separate events.

See [Architecture and data flow](docs/02-guides/dataFlow.md) for the paths connecting these terms.

## Frame

### Frame

The layout every page shares: the side bar, left panel, center panel, and right panel, from left to right, each running the full window height, with the header floating over their tops. The frame owns layout and layout state; pages supply only content. This split is the workspace's main rule: a page never positions, sizes, or animates its panels, and the frame never knows what a page shows.

### Side bar

The narrow vertical bar of page links on the far left, running from the top of the window to the bottom. Pages in the bottom group, such as settings, sit at its bottom. The side bar is always visible.

### Header

A transparent bar floating over the top of the workspace. It holds the left panel toggle just right of the side bar, level with the first page icon, and the right panel toggle at the far right. It does not cover the side bar. Panels slide beneath it as they open, close, and resize, so its controls stay in place on every page. Only the toggles take pointer input.

### Title row

The top row of each panel, under the header: a side panel's title or the center panel's title. The rows share one height so their bottom borders form a single line. A row's content area is exactly the header's height, with its border drawn below, so title text and the header's toggles share one vertical center. Pages supply a side panel's title, not its title row.

**Toggle clearance** is the extra padding the frame adds to a title row that sits under a header toggle. The left panel's title row always clears the left toggle; when the left panel is collapsed, the center panel's title clears it instead. The right edge works the same way. When a toggle collapses or reopens a panel, the padding animates with it, so content slides out from under the toggle rather than jumping.

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

The frame's position for one side panel, managed by `SidePanel`. The slot is open only when the page supplies a panel on that side and it is not collapsed. Widths live in the shared panel state, so they survive route changes independently of panel content. Route-local panel content may unmount and reset its state.

Only the panel toggle animates a side panel. Changing pages swaps panels instantly, even when the new page opens or closes a side, so moving between pages never shows a panel sliding.

### Side panel state

Whether each side panel is collapsed, and its width. The panel state store inside `Workspace` owns each side's collapsed state and width. Both carry across pages: a panel collapsed or resized on one page stays that way on the next page that has it. This state is local to the workspace mount and resets on refresh; it is not part of the session snapshot.

### Panel toggle

The header button that collapses or reopens a side panel. `Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right when the current page supplies them. It renders only when the current page has a panel on that side, so pages never need to hide it themselves.

### Interior edge

The border of a side panel that faces the center panel. Drag it to resize the panel, or focus it and use the arrow keys, Home, and End. Double-click it to restore the default width. A collapsed panel stays mounted so its state, such as a message draft, survives being reopened.

## Navigation and routes

### Navigation entry

A sidebar link in `app/(workspace)/navigation.tsx` containing `href`, `label`, `icon`, and optional `placement`. Entries contain no page or panel components. Next.js owns routes, redirects, and unknown-route 404s.

### Route

A Next.js page selected by its URL. Each product route renders `WorkspacePage`. There is no central page registry or package page export. The [routing guide](docs/02-guides/routing.md) explains the persistent shared layout.
