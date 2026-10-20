# Architecture

See [app direction](../05-app/README.md) for the session, identity, and optional MCP boundaries.

Genomebrowser is built primarily for embedding in Weng Lab websites. It also supports a standalone browser and developers building their own applications. Real integration needs should guide its design.

Applications should be able to add visualizations, supply data, and configure scientific workflows through public APIs. First-party tracks should cover common formats and let applications reuse their fetchers and renderers. Application-specific behavior should not require changes to the browser's internals.

Prefer modules that give callers useful behavior through understandable interfaces. See [module design](module-design.md) for responsibility, interface, and seam decisions within a package.

Keep responsibilities focused. Core should provide general browser capabilities, first-party tracks should be broadly useful, and applications should own their specific workflows. A feature's usefulness to one website does not mean it belongs in the shared library.

Let experience justify abstractions and shared features. Start with a concrete need, learn from integrating it, and generalize when the responsibility becomes clear. Existing package contents are evidence of how the project developed, not a reason to preserve a boundary that no longer makes sense.

## How the parts fit together

An application composes the browser by creating its browser and track stores, registering track modules, and rendering the core browser. The browser store holds browser state such as the visible region; the track store holds the registered modules and track instances. Application controls and browser-hosted components use those stores to interact with the same browser.

Within core, `GenomeBrowser` owns public props and container sizing. `BrowserProvider` owns data-controller lifetime and keeps mount-private UI stores separate from the replaceable application stores. `BrowserCanvas` owns the SVG element, its hosting context, and paint order. Keep sizing changes, request cleanup, and layer composition with those owners so callers do not have to coordinate their lifetimes.

A track module supplies the behavior for its visualization, including fetching, rendering, and configuration validation. This lets first-party and application-owned modules participate through the same contract while hiding their data and rendering details from core.

| Part                    | Role                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`         | Embeddable browser runtime, state, and track-module contracts.                                                                |
| `packages/tracks`       | First-party modules and shared track-specific presentation. Modules use core's public contracts and reader for genomic files. |
| `packages/reader`       | Genomic file reading, usable independently of the browser.                                                                    |
| `packages/ui`           | Navigation, track selection, highlight controls, and chromosome overviews for embedding the browser in existing websites.     |
| `apps/web`              | Next.js product routes, saved sessions, generic workspace layout, command handlers, and command proxy.                        |
| `apps/contracts`        | Private app command contracts, wire schemas, and shared region schema.                                                        |
| `apps/server`           | Optional persistent MCP server: MCP tools and command delivery to tabs. No database.                                          |
| `packages/create`       | A starter generator for developers building a browser application.                                                            |
| `packages/render-probe` | Internal test utility that measures React render counts for render budgets. Private and unpublished.                          |

Core and reader provide independent foundations. Tracks combines their capabilities; UI supplies controls around the browser. Applications choose the modules and controls that fit their workflows. The web app is one such application, not the source of every shared component's requirements.

`packages/` contains the embeddable browser libraries and their tooling. `apps/` contains the applications and private packages shared by those applications, including `apps/contracts`. Applications import that package through `@weng-lab/contracts`, never through another app's source. Saved-session schemas and runtime behavior stay with their app owners.

The archived playground and standalone applications live in `legacy/playground` and `legacy/standalone`. They are excluded from the pnpm workspace. Ongoing product development belongs in `apps/web` and `apps/server`.

The web app owns concrete Next.js routes for `/browser/[sessionId]`, `/collections`, and `/settings`; its root redirects to `/browser`, which shows the open session or an empty state, and unknown routes return 404. Domain components and operations live in `features/`; `app/` owns thin Next.js routes and layout orchestration. `composition/` wires concrete providers, navigation, and server dependencies. Generic layout and panel components in `shared/workspace/` do not import domain components or browser state.

The shared route layout composes `AppProviders`, `Workspace`, and route children. `AppProviders` owns the browser session and command connection above the routes. `Workspace` owns navigation and panel state, while each route supplies its title, panels, and center content through `WorkspacePage`. Navigation entries contain links and labels, not page components. The shared layout preserves the session and panel state across route changes; page-local component state may reset. Refreshing creates new stores and restores the session named in the URL before the browser view appears.

The web app saves sessions in PostgreSQL through its own routes. The optional MCP server uses Hono on Node.js. It exposes commands to agents as MCP tools and delivers each call over SSE to the tab connected for that session. `server.ts` wires the routes, tab connections, and MCP endpoint together. Command contracts, wire schemas, and the shared region schema live in the private `@weng-lab/contracts` package in `apps/contracts`. Both apps depend on it through the workspace; the web app's handlers run them against the same browser stores as the UI. Open tabs and pending replies live in memory, keyed by session ID, and only the first tab to connect receives a session's commands. The server has no database. Next.js rewrites `/mcp` and `/rpc/:id` to it.

The local MCP server requires no credentials. The last saved snapshot wins across tabs. MCP authentication, conflict resolution, ACP, and Eve integrations are not implemented. See the [web app guide](../../apps/web/README.md) for development and deployment instructions.

For decisions about extending these parts, see [Where features belong](02-feature-placement.md).
