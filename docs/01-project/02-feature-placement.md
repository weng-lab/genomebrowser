# Where features belong

Choose where a feature belongs by asking what responsibility it introduces and which tracks or applications can use it. The [architecture overview](01-architecture.md) explains the system and the design philosophy behind these choices.

## General browser capabilities belong in core

Core provides capabilities that tracks can participate in without the browser knowing their data sources or scientific meaning. Interaction is an example: many kinds of tracks need click and hover behavior, while each module determines which rendered items are interactive and the application determines what those interactions mean.

A feature does not need to benefit every track immediately to justify a core change. One track can reveal a general need. The question is whether the capability makes sense for other tracks without carrying the motivating track's special cases into core. Fetching a particular website's dataset fails that test; it belongs in the module or application that understands the dataset.

Keep core stable by first checking whether existing public capabilities already support the feature. Add a core capability when the browser itself needs new behavior or coordination, rather than because one module's implementation is complicated.

## Expose browser capabilities through small interfaces

Hooks are a useful way for components hosted by the browser to access its capabilities. For example, `useGenomeBrowser` exposes the hosting browser's browser and track stores. A track can use those stores to change the browser's region without adding track-specific navigation behavior to core.

The boundary is about responsibility, not preventing tracks from affecting browser state. Core owns the general state operations; a module decides when its visualization should use them. Keep access tied to the hosting browser and prefer a small public interface over requiring callers to coordinate internal context or providers.

A hook is an access mechanism, not a complete solution to every feature. If a request changes how the browser manages tracks or coordinates behavior, exposing existing state may not be sufficient. Identify the browser responsibility first, then choose an interface that lets modules participate.

## Keep specialized behavior with its owner

Track modules own their fetching, rendering, and track-specific presentation. Application-owned modules can reuse first-party implementations while supplying different behavior. First-party tracks should remain useful across applications for data that meets their supported format and schema.

Serializable configuration customizes an instance within the behavior its module provides. Replacing fetching, rendering, tooltips, or settings generally calls for a distinct module, which can reuse an existing implementation through supported extension points. Application interaction callbacks can still belong to individual instances; they do not by themselves require a new module.

Applications own product workflows, such as searching a particular catalog and adding results to the browser. Operating on browser state does not by itself make a control a core feature.

## Reader provides programmatic access to genomic files

Reader retrieves genomic data without requiring callers to implement file formats or transport. Track fetchers use it to load data for the requested region.

Caching supports file access; it does not make Reader a general caching system. First-party track fetchers retain file-reader objects in their track-scoped `resources`. Those objects reuse metadata, including headers, across reads of the same source. This does not mean they cache every requested region's records.

Reader could eventually expose additional caching capabilities, such as a region cache that fetchers could retain through resources. That is a possible extension, not an established API or a requirement to move all track caching into reader. Keep the file-access interface simple and evaluate broader caching features when a concrete need warrants them.

## UI provides controls for embedding

UI provides navigation, track selection, and other browser controls for embedding applications such as SCREEN, PsychSCREEN, and Factorbook.

The web app owns its interface and application-specific components. It may use UI components when they fit, but is not required to. Add components to UI when they are useful to embedding applications, not merely to place product components in a shared package.

## Product behavior belongs in the web app

The app is moving toward [feature-owned data and injected capabilities](../05-app/features.md). Follow that direction for refactor work; the session and server placement described below reflects the current implementation.

Put browser-product pages and workflows in `apps/web`. Each route's `page.tsx` composes `WorkspacePage` with domain components colocated in that route folder. `components/workspace/` owns generic layout, sizing, panel controls, motion, and theme. It must not import domain components or genome browser state.

Add a route and a link in `app/(workspace)/navigation.tsx` for a new page. Navigation entries contain only `href`, `label`, `icon`, and optional `placement`. Keep page titles and panel content in the route, without a central page registry or package exports.

The shared route layout keeps `AppProviders` and `Workspace` above route children. Put shared browser state and command behavior in `browser/`, with browser and track stores in `browser/BrowserSession.tsx`. `AppProviders` owns their lifetime and composes `BrowserServer` for saving and remote control. Keep browser-page views and panels in `app/(workspace)/browser/`. `Workspace` owns panel state lifetime, with the `panelState.tsx` module alongside panel components in `components/workspace/panels/`. Keep page-specific state with its page unless it must survive navigation or be shared across routes.

`apps/server` owns the command protocol, session persistence, and MCP. Put each command in its own file under `src/commands/` using `defineCommand`, and add it to the registry in `src/commands/index.ts`; `src/mcp.ts` exposes it as a tool and the web app runs it in the tab. Keep tab connections in `src/tabs.ts`, pending replies in `src/pendingCommands.ts`, and database implementations behind the interface in `src/storage/sessionRepository.ts`. The entry point supplies dependencies; `src/server.ts` wires routes, tab connections, MCP, and the HTTP listener together. Put browser-safe schemas in its `protocol` export and server transport in its Node.js implementation. The web app's command adapter validates messages and invokes existing browser-store actions. Keep live genome state in the browser; the server tracks streams and commands awaiting replies in memory and persists serializable session snapshots through its injected `SessionRepository`. The browser-safe snapshot schema lives in `packages/session-snapshot`, and storage adapters stay in `apps/server`; runtime loading state and track resources are not saved. Next.js rewrites `/api/*` and `/mcp` to that service.

SQLite stores sessions by ID; the web app takes the ID from the `/browser/[sessionId]` URL. Another database can implement the asynchronous repository interface. Multi-user authentication, isolated sessions, and conflict resolution are future integration work. Local development and cloud hosting use the same Next.js app, with a separately hosted persistent server where necessary. The [web app guide](../../apps/web/README.md#change-the-product) explains how to add routes and commands.

## Example of an open placement decision: grouped tracks

BulkBed combines multiple BigBed datasets within one track. Suppose an application asks to generalize that idea into a group accepting different registered track modules. Should that group be another track module, or should core coordinate the grouped tracks?

This is an unresolved design question, not an established feature or placement rule. The answer depends on what grouping means for the requested workflow and which responsibilities it changes. If existing browser capabilities are sufficient, a module may own the composition. If grouping requires new browser coordination, identify that general capability separately from the grouped visualization. BulkBed provides a starting example, not a decision about the broader design.
