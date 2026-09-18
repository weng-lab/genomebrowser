# Genomebrowser

pnpm monorepo for an embeddable React genome browser.

## Where to look

Read the guidance relevant to the change:

- Project structure and feature ownership: [architecture](docs/project/architecture.md) and [feature placement](docs/project/feature-placement.md).
- Application UI in `packages/ui` or `apps/*`: [interface design](docs/project/design.md).
- Tests and verification: [testing](docs/contributing/testing.md) and [verification](docs/contributing/verify.md). Use `pnpm verify` for the workspace check.
- Package scripts, Turbo, or CI orchestration: [builds](docs/tooling/builds.md). Shared dependency changes: [dependencies](docs/tooling/dependencies.md).

Maintainer guidance lives in `docs/`. Consumer docs in `packages/*/docs/` ship with their packages; keep them self-contained and update them when public behavior changes.

Before changing a Next.js app, read that app's installed `node_modules/next/dist/docs/index.md`, then the relevant pages. Follow the installed version's guidance and deprecation warnings.

## Constraints

- Zustand store hooks must have names starting with `use` so the React compiler recognizes them.
- Do not invent track URLs. Use `YOUR_URL_HERE` or an existing repository URL.
- Do not introduce compatibility layers, aliases, or temporary exports for older package versions unless explicitly asked to. Bring up when it may be useful.
- Before including changes from outside this session in a commit, ask the user whether to include them.
