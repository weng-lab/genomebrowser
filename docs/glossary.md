# Glossary

Use these terms in code, issues, and docs. Each entry says what a term means, not how the code implements it.

When your work introduces or keeps relying on a domain concept that is not listed here, or two names for one thing start to compete, suggest adding it in the same PR. Add domain terms, not names of UI parts or code.

## Browser and coordinates

**Browser instance** - One mounted genome browser with its own rendering and track resources. The **host application** embeds it. Instances may share the host's stores.

**Browser store / track store** - The two host-owned stores. The browser store holds the assembly, viewport, highlights, and browser settings; the track store holds track modules, instances, order, and configuration. A **session** is the app's saved browsing setup, not either store.

**Viewport** - The visible genomic span. **Zoom** changes the span; **scale** changes drawing and control size. The **render region** is the span prepared for drawing, including **overscan** beyond the viewport for panning.

**Coordinate space** - Genomic bases, logical SVG units, or screen pixels; always say which. Internal regions are zero-based and half-open ([ADR 0006](adr/0006-internal-zero-based-coordinates.md)). **Display coordinates** are the one-based, inclusive positions people read and type, as in UCSC; convert only where people see them.

**Region / locus** - A region is a span on one chromosome. Use locus for a biological location, such as a gene's.

**Highlight / saved region** - A highlight marks a region on every track. In the app, a saved region is a named highlight saved with the session, and a **region group** gathers saved regions under a name and color.

## Tracks

**Track (track instance)** - One configured visualization in a browser. A **pinned** track is excluded from drag reordering and sorting; it is not sticky on scroll.

**Track module** - The reusable implementation of a track type: fetching, rendering, validation, and optional settings and tooltips. The **module registry** maps type IDs to modules.

**Track configuration** - Shared base settings plus module-specific configuration. **Source ownership** records whether the host application or the user controls a track's data source. **Track metadata** is descriptive fields beside the configuration, such as assay, cell type, or a user's tag; it never changes what a track fetches or draws.

**Display mode** - A module's choice of how to draw its data. Not to be confused with a **collection view**, which organizes a catalog.

**Base-pair detail** - Per-base glyphs, drawn only when the view is zoomed in far enough.

**Row layout** - Packing items into rows inside one track. **Row height** is not **track height**, and row layout is not track order.

## Collections and fetching

**Track collection** - A catalog of configured tracks for one assembly. A **collection entry** is a recipe for one track: its type, configuration, and metadata. Creating a track copies them as starting values; after that the track owns its values, so editing it never changes the entry. A **qualified track ID** (`collection::entry`) names an entry across collections.

**Render demand** - The region and width the browser asks a track's fetcher to satisfy. **Fetch-affecting configuration** is configuration whose change requires fetching again.

**Track resources** - Values a track keeps between fetches, such as file readers and caches, released when the track or its stores go away.

## App

**Workspace** - The app's generic frame: navigation, side panels, and their layout state. It knows nothing about sessions, browsers, or any page's content.

**Session** - A named browsing setup for one assembly, owned by one account. The **open session** is the one a tab is showing and editing; there is one per tab. Its **snapshot** is the serializable setup: no fetched data, loading state, resources, or functions.

**Revision / conflict** - Each save advances a session's revision. Tabs send edits as section patches that the server merges onto the latest revision, then announces the new revision to every open tab. A conflict arises only when concurrent merge retries are exhausted, never as a silent overwrite. A **save ID** names one logical save; the server remembers recent ones so a retried save is applied only once.

**Command / reply** - A command is an app action an agent can request through MCP; its definition is both the MCP tool and what runs it. A **state command** runs on the server against the saved session, whether or not a tab has it open; a **browser command** needs the DOM or browser-side fetches and runs in the tab. The reply is the command's result or failure. A successful state command reply means the change was saved; a successful browser command reply means the stores accepted it, not that track data loaded or the session saved.

**Remote control** - A tab's connection for receiving commands for its open session. It is an account preference, on by default; turning it off stops all agent access while manual browsing keeps working.

**Command relay / lease** - The relay carries browser commands and replies through Redis between the server handling an MCP call and the one holding the tab's connection. A session's lease names the one connection that receives its commands.

**Agent thread / run** - A session's agent thread is its one conversation with the integrated agent, shared across tabs and devices until **New conversation** or deleting the session ends it. A run is the agent's work on one message; it lives only while a tab holds the session.

**Control lock** - The agent's hold on a session's browser during a workflow of several steps. While it is held, the user's edits are blocked; it ends with its run, and an agent can give back only a lock it took.

## Testing

**Render budget** - The exact number of committed React renders an interaction is allowed.
