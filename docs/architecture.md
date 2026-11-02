# Architecture

Genomebrowser is built primarily for embedding in Weng Lab websites. It also supports developers building their own applications. Real integration needs should guide design. Application-specific behavior should not require changes to browser internals.

Prefer modules that give callers useful behavior through understandable interfaces ([module design](module-design.md)). Keep responsibilities focused: core for general browser capabilities, first-party tracks for broadly useful formats, applications for product workflows. Experience justifies abstractions; existing package contents are evidence, not sacred boundaries.

Recorded decisions: [ADR index](adr/README.md).

## Package roles

| Part                    | Role                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `packages/core`         | Embeddable browser runtime, state, and track-module contracts              |
| `packages/tracks`       | First-party track modules and shared track presentation                    |
| `packages/reader`       | Genomic file reading (usable without the browser)                          |
| `packages/ui`           | Optional embedding controls (navigation, selection, highlights, overviews) |
| `packages/create`       | Starter generator for v2 packages                                          |
| `packages/render-probe` | Private render-budget test utility                                         |
| `apps/web`              | Product Next.js app (sessions, routes, command handlers)                   |
| `apps/server`           | Optional MCP relay to browser tabs (no database)                           |
| `apps/contracts`        | Private command/wire/region schemas shared by the apps                     |
| `legacy/*`              | Archived playground and standalone; outside the pnpm workspace             |

Core and reader are independent foundations. Tracks combines them. UI wraps the browser for host sites. The web app is one consumer, not the source of every shared component's requirements.

Within core, keep sizing, data-controller lifetime, and SVG/paint ownership with `GenomeBrowser`, `BrowserProvider`, and `BrowserCanvas` respectively so callers do not coordinate those lifetimes. Details live in code and in core's packaged docs.

For where a new capability belongs, see [feature placement](feature-placement.md). For app product intent, see [product](product/README.md). For runbooks, see `apps/web/README.md` and `apps/server/README.md`.
