# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Knowledge base

Take patterns and implementation details from the code. [docs/README.md](docs/README.md) holds what the code cannot show: decisions, requirements, vocabulary, and product intent.

Read what the change needs:

- Terms: [glossary](docs/glossary.md)
- Decisions lint cannot enforce, including React and embedded UI: [code standards](docs/code_standards.md)
- Package roles and philosophy: [architecture](docs/architecture.md), [feature placement](docs/feature-placement.md)
- App product intent: [product](docs/product/README.md)
- Tests and handoff: [testing](docs/contributing/testing.md), [verify](docs/contributing/verify.md)
- Recorded decisions: [ADRs](docs/adr/README.md)

Before handing off a change, run `pnpm format`, `pnpm verify`, and `pnpm run doctor` from the repository root.

Consumer docs live in `packages/*/docs/` and ship with packages. Update them when public behavior changes. Before changing the Next.js app, read its installed `apps/web/node_modules/next/dist/docs/index.md` and follow that version.

Skills under `.agents/skills/` route into the knowledge base and add agent-only steps. Load the ones that match the task.

Before including changes from outside this session in a commit, ask the user whether to include them.
