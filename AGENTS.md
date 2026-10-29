# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Knowledge base

Start at [docs/README.md](docs/README.md). It is the genome browser knowledge base for agents and maintainers: decisions, vocabulary, product intent, and contribution judgment the code cannot show.

Read what the change needs:

- Terms: [glossary](docs/glossary.md)
- Principles lint cannot enforce: [code standards](docs/code_standards.md)
- Package roles and philosophy: [architecture](docs/architecture.md), [feature placement](docs/feature-placement.md)
- Module boundaries: [module design](docs/module-design.md); use the architecture-design skill before a substantial new seam
- App product intent: [product](docs/product/README.md)
- Tests and handoff: [testing](docs/contributing/testing.md), [verify](docs/contributing/verify.md)
- Recorded decisions: [ADRs](docs/adr/README.md)

Consumer docs live in `packages/*/docs/` and ship with packages. Update them when public behavior changes. Before changing a Next.js app, read that app's installed `node_modules/next/dist/docs/index.md` and follow its version.

Skills under `.agents/skills/` are thin routers into this knowledge base plus agent-only steps. Do not treat a skill as a second policy store.

Before including changes from outside this session in a commit, ask the user whether to include them.
