# Architecture

For the app refactor, follow [app direction](../05-app/README.md). The app and server descriptions below reflect the current implementation, not the target Clerk, Drizzle, and optional-MCP boundaries.

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
| `apps/web`              | Next.js product routes, browser session, generic workspace layout, and command proxy.                                         |
| `apps/server`           | Persistent Node.js server: SQLite sessions, MCP, command delivery to tabs, and browser-safe protocol schemas.                 |
| `packages/create`       | A starter generator for developers building a browser application.                                                            |
| `packages/render-probe` | Internal test utility that measures React render counts for render budgets. Private and unpublished.                          |

Core and reader provide independent foundations. Tracks combines their capabilities; UI supplies controls around the browser. Applications choose the modules and controls that fit their workflows. The web app is one such application, not the source of every shared component's requirements.

The archived playground and standalone applications live in `legacy/playground` and `legacy/standalone`. They are excluded from the pnpm workspace. Ongoing product development belongs in `apps/web` and `apps/server`.

The web app owns concrete Next.js routes for `/browser/[sessionId]`, `/collections`, and `/settings`; its root and `/browser` redirect to the current or default session, and unknown routes return 404. Domain components live beside their route's `page.tsx`. Generic layout and panel components in `components/workspace/` do not import domain components or browser state.

The shared route layout composes `AppProviders`, `Workspace`, and route children. `AppProviders` owns the browser session and command connection above the routes. `Workspace` owns navigation and panel state, while each route supplies its title, panels, and center content through `WorkspacePage`. Navigation entries contain links and labels, not page components. The shared layout preserves the session and panel state across route changes; page-local component state may reset. Refreshing creates new stores and restores the shared saved hg38 session before the browser view appears.

The persistent browser server uses Hono on Node.js. It saves sessions, exposes browser commands to agents as MCP tools, and delivers each command over SSE to the tab that has the session open. `server.ts` wires the routes, tab connections, and MCP endpoint together. Commands are listed once in the protocol export, which also defines their MCP tools; the web app executes them against the same browser stores as the UI. Open tabs and pending replies live in memory, keyed by session ID, and only the first tab to connect receives a session's commands. Live genome state stays in the browser; serializable snapshots of browser settings, highlights, and ordered track configurations persist in SQLite by session ID through an injected asynchronous session repository. Next.js rewrites `/api/*` and `/mcp` to the server. The protocol export contains browser-safe Zod schemas; Node.js server code stays out of the frontend.

The local server requires no credentials. The last saved snapshot wins across tabs. Authentication, conflict resolution, ACP, and Eve integrations are not implemented. See the [web app guide](../../apps/web/README.md) for development and deployment instructions.

For decisions about extending these parts, see [Where features belong](02-feature-placement.md).
