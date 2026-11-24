# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Knowledge base

Start at [docs/README.md](docs/README.md). It is the genome browser knowledge base for agents and maintainers: decisions, vocabulary, product intent, and contribution judgment the code cannot show.

Read what the change needs:

- Terms: [glossary](docs/glossary.md)
- Decisions lint cannot enforce, including React and embedded UI: [code standards](docs/code_standards.md)
- Package roles and philosophy: [architecture](docs/architecture.md), [feature placement](docs/feature-placement.md)
- App product intent: [product](docs/product/README.md)
- Tests and handoff: [testing](docs/contributing/testing.md), [verify](docs/contributing/verify.md)
- Recorded decisions: [ADRs](docs/adr/README.md)

Before handing off a change, run `pnpm format`, `pnpm verify`, and `pnpm run doctor` from the repository root.

Consumer docs live in `packages/*/docs/` and ship with packages. Update them when public behavior changes. Before changing the Next.js app, read its installed `apps/web/node_modules/next/dist/docs/index.md` and follow that version.

Skills under `.agents/skills/` are thin routers into this knowledge base plus agent-only steps. Load the skills that match the task before starting. Do not treat a skill as a second policy store.

Before including changes from outside this session in a commit, ask the user whether to include them.
