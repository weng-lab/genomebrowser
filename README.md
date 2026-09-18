# Weng Lab Genome Browser

This pnpm monorepo contains independently versioned packages for the Weng Lab Genome Browser. See the [release guide](docs/tooling/releases.md) for version selection and publication.

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

- `apps/standalone` (`@weng-lab/genomebrowser-standalone`) is the deployed web application.
- `apps/playground` (`@weng-lab/genomebrowser-playground`) contains experiments and custom browser setups. It resolves workspace package imports directly to source; preserved package demos under `examples/` are intentionally not routed.

User-facing documentation is shipped from each package's `docs/` directory.
See the [maintainer docs](docs/README.md) and [contribution guide](docs/contributing/README.md) for repository guidance.

## Install

The package documentation targets stable v2.0.0. Create an application with:

```sh
npm create @weng-lab/genomebrowser@2.0.0 my-browser
```

For an existing application, follow the installation instructions in the
[core README](packages/core/README.md). All five public packages use the
`latest` npm dist-tag for stable releases.

## Setup

Use the pnpm version declared in `package.json`, then install workspace
dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
```

The workspace packages use the root Oxlint and Oxfmt installations and pin
their framework and TypeScript dependencies in their own manifests.

## Commands

Run commands from the repository root. Turborepo runs each task in the workspace
projects that define it, follows package dependencies, and reuses results from
its local cache. See the [build orchestration guide](docs/tooling/builds.md) for
filters, cache behavior, and task configuration.

| Task             | Workspace           | Focused example                                                            |
| ---------------- | ------------------- | -------------------------------------------------------------------------- |
| Build            | `pnpm build`        | `pnpm exec turbo run build --filter=@weng-lab/genomebrowser-tracks`        |
| Test             | `pnpm test`         | `pnpm exec turbo run test --filter=@weng-lab/genomebrowser-tracks`         |
| Typecheck        | `pnpm typecheck`    | `pnpm exec turbo run typecheck --filter=@weng-lab/genomebrowser-tracks`    |
| Lint             | `pnpm lint`         | `pnpm exec turbo run lint --filter=@weng-lab/genomebrowser-tracks`         |
| Check formatting | `pnpm format:check` | `pnpm exec turbo run format:check --filter=@weng-lab/genomebrowser-tracks` |

Human maintainers can run `pnpm dev` or `pnpm playground dev` for the playground and `pnpm standalone dev` for the standalone product.
Automation agents must not start the development servers; inspect
`.devserve/out.log` and `.devserve/err.log` when diagnosing a server already
started by a user.

Set `SCREEN_API_KEY` in the standalone app's local environment for transcript data. The app
reads the key only in its server-side SCREEN GraphQL proxy; the key is not
exposed to browser code.

Before submitting a change, follow the [verification guide](docs/contributing/verify.md). Package publication is a separate maintainer action described in the [release guide](docs/tooling/releases.md).
