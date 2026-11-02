# Web app glossary

Terms for the Next.js browser product, saved sessions, the MCP server, and generic workspace layout. Entries define what a term means, not how the app currently implements it; the [app docs](docs/README.md) cover current behavior. The [project glossary](../../docs/glossary.md) covers browser and track terms.

## Application and session

### Workspace

The generic full-window layout. It knows nothing about domain components or browser state.

### Route composition

What a route supplies to the workspace: a title and its content for the center and side panels.

### Session owner

The object that manages sessions for one account. It lists saved sessions, owns the **open session** and its live browser and track stores, runs autosave, and performs session operations as complete operations.

## Commands and persistence

### MCP server

The optional persistent process, also called the browser server, that exposes commands to agents over MCP and delivers each call to the browser tab connected for the session. It relays commands; it does not own persistence or live browser state.

### Remote control

A tab's connection to the MCP server for one session, through which the tab receives commands. Saving does not depend on it.

### Command and reply

A command is an app action an agent can request. Its **command contract** defines the tool name, description, parameter schema, and result schema. The web app's **command handler** carries it out. The **reply** is the command's result on success, or the action's failure. Success means applied to the store, not finished loading track data or saved to the database.

A **pending command** has been sent to a tab and is waiting for its reply.

### Session snapshot

The versioned, serializable representation of a browsing setup. It excludes fetched data, loading state, resources, module implementations, and functions. A **session** is a named snapshot saved for one owner. Each save advances the session's **revision** and names the revision it was based on, so a save from a tab behind another tab's save is a **conflict** rather than an overwrite.

### Save status

The indicator that tells the user whether their edits are saved. A command reply and save completion are separate events.

A **save ID** identifies one logical save, so the server recognizes a retry of a save it already applied and does not apply it twice.

See [Architecture and data flow](docs/02-guides/dataFlow.md) for the paths connecting these terms.

## Frame

### Frame

The layout every page shares: the side bar, left panel, center panel, and right panel, with the header floating over their tops. The frame owns layout and layout state; pages supply only content. This split is the workspace's main rule: a page never positions, sizes, or animates its panels, and the frame never knows what a page shows.

### Side bar

The narrow vertical bar of page links on the far left.

### Header

The transparent bar floating over the top of the workspace. It holds the panel toggles.

### Title row

The top row of each panel, under the header. **Toggle clearance** is the extra padding the frame adds to a title row that sits under a header toggle.

### Text trimming

Removing a font's uneven built-in space above and below its letters so text centers correctly. See [Styling and text](docs/02-guides/styling.md).

## Panels

### Center panel

The main content area between the side panels.

### Left panel

The side panel beside the side bar, usually navigation within the current page.

### Right panel

The side panel on the right edge, usually a tool that works alongside the page, such as an assistant.

### Absent and collapsed panels

A side panel is **absent** when the current page does not supply one, and **collapsed** when the page supplies one but the user has hidden it.

### Side panel slot

The frame's position for one side panel.

### Side panel state

Whether each side panel is collapsed, and its width. It belongs to the workspace, not the session snapshot.

### Panel toggle

The header button that collapses or reopens a side panel.

### Interior edge

The border of a side panel that faces the center panel, used to resize it.

## Navigation and routes

### Navigation entry

A sidebar link. It describes a destination and contains no page or panel components.

### Route

A Next.js page selected by its URL. The [routing guide](docs/02-guides/routing.md) explains the persistent shared layout.
