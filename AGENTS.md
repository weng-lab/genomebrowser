# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Where to look

Read the guidance relevant to the change:

- Shared project terminology: [glossary](docs/glossary.md). Use its terms consistently and suggest additions when new project-specific terms arise, grouping related terms under existing entries where possible.
- Project structure and feature ownership: [architecture](docs/01-project/01-architecture.md) and [feature placement](docs/01-project/02-feature-placement.md).
- Application UI in `packages/ui` or `apps/*`: [interface design](docs/01-project/03-design.md).
- Tests and verification: [testing](docs/02-contributing/testing.md) and [verification](docs/02-contributing/verify.md). Use `pnpm verify` for the workspace check.
- Package scripts, Turbo, or CI orchestration: [builds](docs/03-tooling/builds.md). Shared dependency changes: [dependencies](docs/03-tooling/dependencies.md).

Maintainer guidance lives in `docs/`. Consumer docs in `packages/*/docs/` ship with their packages; keep them self-contained and update them when public behavior changes.

Before changing a Next.js app, read that app's installed `node_modules/next/dist/docs/index.md`, then the relevant pages. Follow the installed version's guidance and deprecation warnings.

## Constraints

- Zustand store hooks must have names starting with `use` so the React compiler recognizes them.
- Do not invent track URLs. Use `YOUR_URL_HERE` or an existing repository URL.
- Do not introduce compatibility layers, aliases, or temporary exports for older package versions unless explicitly asked to. If compatibility support would help, explain why before proposing it.
- Before including changes from outside this session in a commit, ask the user whether to include them.
