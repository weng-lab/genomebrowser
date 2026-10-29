# Where features belong

Choose ownership by the responsibility introduced and which tracks or apps can use it. [Architecture](architecture.md) and [ADR 0001](adr/0001-embeddable-package-boundaries.md) state the package split; [ADR 0004](adr/0004-web-app-feature-layering.md) covers the web app layers.

## Core

Core provides capabilities tracks can participate in without the browser knowing their data sources or meaning (for example interaction). One track can reveal a general need; the test is whether the capability makes sense for other tracks without carrying that track's special cases. Prefer existing public APIs before growing core.

Hooks such as `useGenomeBrowser` expose hosting-browser capabilities. A hook is an access mechanism, not a complete feature design: identify the browser responsibility first.

## Tracks, reader, UI

Track modules own fetching, rendering, and track-specific presentation. Serializable config customizes an instance; replacing fetch/render/settings usually means a distinct module (possibly reusing an implementation).

Reader retrieves genomic data by region. Caching supports file access; it is not a general cache framework. Broader caching belongs in reader only when a concrete need warrants it ([architecture](architecture.md)).

UI holds controls useful to embedding apps (SCREEN, PsychSCREEN, Factorbook, and similar). The web app may use UI components but is not required to. Do not move product-only widgets into UI.

## Web app

Put product pages and workflows in `apps/web`. Routes stay thin; features own UI and operations; composition wires providers and navigation; `shared/workspace` stays free of domain imports and browser state. Features must not import composition.

Command contracts live in `apps/contracts`. Handlers live in the web app; MCP delivery lives in `apps/server`. Neither app imports the other's source ([ADR 0002](adr/0002-web-owns-persistence-mcp-is-relay.md), [ADR 0003](adr/0003-private-contracts-package.md)).

Import and cycle rules are enforced by `.oxlintrc.json` and `tools/lint/policy.test.mjs`. When changing a boundary, update the lint rule and fixtures together. Behavioral invariants belong in schemas, runtime checks, and tests, not new prose rules.

How to run and extend the app: `apps/web/README.md`. Product scope: [product](product/README.md).

## Open example: grouped tracks

Whether a multi-module “group” is another track module or new core coordination is **unresolved**. BulkBed is a starting example, not a decision. Identify any new browser responsibility separately from the visualization.
