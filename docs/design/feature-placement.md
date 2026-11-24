# Where features belong

Choose ownership by the responsibility introduced and which tracks or apps can use it. [Architecture](architecture.md) and [ADR 0001](../adr/0001-embeddable-package-boundaries.md) state the package split; [ADR 0004](../adr/0004-web-app-feature-layering.md) covers the web app layers.

## Core

Core provides capabilities tracks can participate in without the browser knowing their data sources or meaning (for example interaction). One track can reveal a general need; the test is whether the capability makes sense for other tracks without carrying that track's special cases. Prefer existing public APIs before growing core.

Hooks such as `useGenomeBrowser` expose hosting-browser capabilities. A hook is an access mechanism, not a complete feature design: identify the browser responsibility first.

## Tracks, reader, UI

Track modules own fetching, rendering, and track-specific presentation. Serializable config customizes an instance; replacing fetch/render/settings usually means a distinct module (possibly reusing an implementation).

Reader retrieves genomic data by region. Caching supports file access; it is not a general cache framework. Broader caching belongs in reader only when a concrete need warrants it ([architecture](architecture.md)).

UI (`@weng-lab/genomebrowser-ui`) is built as composable primitives first, with larger components composed from them (for example, `NavigationButton` and `RegionControls` under `ControlToolbar`, or `HighlightForm` under `HighlightDialog`). Embedding apps (SCREEN, PsychSCREEN, Factorbook, and similar) can use the primitives directly or compose them to fit their own chrome instead of being stuck with monolithic widgets. The web app may use UI components but is not required to; do not move product-only widgets into UI.

## Web app

Put product pages and workflows in `apps/web`. Routes stay thin; features own UI and operations; composition wires providers and navigation; `shared/workspace` stays free of domain imports and browser state, and `shared/ui` holds the theme and presentational components that the workspace and features both build on. Features must not import composition.

Each agent command is one definition in `features/agent/commands/`, which the tab runs and the MCP endpoint in `features/mcp/` publishes as a tool. Command delivery between server instances and tabs lives in `features/agent/server/` ([ADR 0007](../adr/0007-app-owned-mcp-redis-relay.md)).

For a new app component, the first of these that applies decides where it goes:

1. It only restyles an MUI component everywhere: a theme override in `shared/ui/theme.ts`, not a component.
2. Other embedding sites, such as SCREEN, would want it: `@weng-lab/genomebrowser-ui`, styled only from the host's theme.
3. It is part of the frame's layout (panels, title rows, the header): `shared/workspace/`.
4. A second screen or feature uses it: `shared/ui/` with plain props (no session, store, route, or server imports). If it needs app state, split out the shared visual piece into `shared/ui/` and keep a small wrapper in `features/<feature>/components/` to wire it up, as `StatusTag` and `SaveStatus` do.
5. Otherwise: `features/<feature>/components/`. It stays there until a second screen needs it.

Name `shared/ui/` components for how they look, not the feature that first used them, and give each a section in the design gallery (`apps/web/design/Gallery.tsx`).

Import and cycle rules are enforced by `.oxlintrc.json` and `tools/lint/policy.test.mjs`. When changing a boundary, update the lint rule and fixtures together. Behavioral invariants belong in schemas, runtime checks, and tests, not new prose rules.
