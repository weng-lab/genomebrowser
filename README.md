# Weng Lab Genome Browser

This pnpm monorepo contains independently versioned packages for the Weng Lab Genome Browser. See the [release guide](docs/03-tooling/releases.md) for version selection and publication.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) is the embeddable React runtime.
  It renders genomic tracks and owns the browser state and extension APIs.
- `packages/tracks` (`@weng-lab/genomebrowser-tracks`) provides the
  MUI-based BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, MethylC, and Gene
  modules.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) provides optional, higher-level
  application controls that depend on the runtime. Applications that only need
  the browser do not need this package.
- `packages/reader` (`@weng-lab/genomic-reader`) provides format-independent
  TypeScript contracts for reading genomic data by region.
- `packages/create` (`@weng-lab/create-genomebrowser`) creates an editable
  browser application with the stable v2 packages.

Private applications live under `apps/`:

- [Standalone app](apps/standalone/README.md) (`apps/standalone`, `@weng-lab/genomebrowser-standalone`) is the deployed web application. Its [local development guide](apps/standalone/docs/localDevelopment.md) covers accounts, database access, and SCREEN search.
- `apps/playground` (`@weng-lab/genomebrowser-playground`) contains experiments and custom browser setups. It resolves workspace package imports directly to source; preserved package demos under `examples/` are intentionally not routed.

See the [maintainer docs](docs/README.md) and [contribution guide](docs/02-contributing/README.md) for repository guidance.

## Install

The package documentation targets stable v2.0.0. Create a new application with:

```sh
npm create @weng-lab/genomebrowser@2.0.0 my-browser
```

For an existing application, follow the installation instructions in the
[core README](packages/core/README.md). All five public packages use the
`latest` npm dist-tag for stable releases.

## Read the installed package docs

The core, tracks, UI, and reader packages ship their documentation in `docs/`. Before writing or changing an integration, open the relevant index from your application's directory:

- `node_modules/@weng-lab/genomebrowser/docs/README.md`
- `node_modules/@weng-lab/genomebrowser-tracks/docs/README.md`
- `node_modules/@weng-lab/genomebrowser-ui/docs/README.md`
- `node_modules/@weng-lab/genomic-reader/docs/README.md`

Follow the index to the guides and API references for the task. Prefer these bundled docs when working with an installed package because they describe that version; the repository's default branch may document a different version. Include this instruction in your application's `AGENTS.md` when using coding agents. Generated applications already include it.

## Setup

Use the pnpm version declared in `package.json`, then install workspace
dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
```

The workspace packages use the root Oxlint and Oxfmt installations and pin
their framework and TypeScript dependencies in their own manifests.

## Commands

Run `pnpm verify` from the repository root for the usual workspace check. It runs
formatting checks, lint, builds, and tests. Use the individual commands below for
focused work.

Turborepo runs each task in the workspace
projects that define it, follows package dependencies, and reuses results from
its local cache. See the [build orchestration guide](docs/03-tooling/builds.md) for
filters, cache behavior, and task configuration.

| Task             | Workspace           | Focused example                                                            |
| ---------------- | ------------------- | -------------------------------------------------------------------------- |
| Verify workspace | `pnpm verify`       | Run from the repository root for the full check.                           |
| Build            | `pnpm build`        | `pnpm exec turbo run build --filter=@weng-lab/genomebrowser-tracks`        |
| Test             | `pnpm test`         | `pnpm exec turbo run test --filter=@weng-lab/genomebrowser-tracks`         |
| Typecheck        | `pnpm typecheck`    | `pnpm exec turbo run typecheck --filter=@weng-lab/genomebrowser-tracks`    |
| Lint             | `pnpm lint`         | `pnpm exec turbo run lint --filter=@weng-lab/genomebrowser-tracks`         |
| Check formatting | `pnpm format:check` | `pnpm exec turbo run format:check --filter=@weng-lab/genomebrowser-tracks` |

For more detail about working in this monorepo, see the [maintainer documentation](docs/README.md).
