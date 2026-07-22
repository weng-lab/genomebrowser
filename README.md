# Weng Lab Genome Browser

This pnpm monorepo contains the coordinated `2.0.0-alpha.0` generation of the
Weng Lab Genome Browser. The packages are prereleases and are not intended to
replace an npm `latest` release. Any publication must retain the configured
`alpha` dist-tag.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) is the embeddable React runtime.
  It renders genomic tracks and owns the browser state and extension APIs.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) provides optional, higher-level
  application controls that depend on the runtime. Applications that only need
  the browser do not need this package.

User-facing documentation is shipped from each package's `docs/` directory.
Repository decisions and contributor guidance live in the root `docs/`
directory and `AGENTS.md`.

## Setup

Use the pnpm version declared in `package.json`, then install the single
workspace dependency graph from the repository root:

```sh
pnpm install --frozen-lockfile
```

The root owns the shared Oxlint and Oxfmt installations and configuration.
Each package owns its TypeScript, Vite, and Vitest configuration and related
dependencies.

## Commands

Run commands from the repository root. The unqualified command checks both
packages; append `:core` or `:ui` to target one package.

| Task             | Both packages       | Runtime only             | UI only                |
| ---------------- | ------------------- | ------------------------ | ---------------------- |
| Build            | `pnpm build`        | `pnpm build:core`        | `pnpm build:ui`        |
| Test             | `pnpm test`         | `pnpm test:core`         | `pnpm test:ui`         |
| Lint             | `pnpm lint`         | `pnpm lint:core`         | `pnpm lint:ui`         |
| Check formatting | `pnpm format:check` | `pnpm format:check:core` | `pnpm format:check:ui` |
| Apply formatting | `pnpm format`       | `pnpm format:core`       | `pnpm format:ui`       |

Run `pnpm validate:packed-consumers` to pack both packages and test the exact
tarballs in a temporary consumer outside the workspace. The check installs the
documented UI peers, type-checks emitted declarations, creates a production
browser build without source aliases, exercises the UI CLI, and inspects the
published files. It removes its temporary tarballs and consumer when finished.

Human maintainers can use `pnpm dev` to start both package servers concurrently,
or `pnpm dev:core` and `pnpm dev:ui` to start one server. Automation agents must
not start the development servers; inspect `.devserve/out.log` and
`.devserve/err.log` when diagnosing a server already started by a user.

Before submitting a change, run the relevant targeted commands followed by
the root build, test, lint, and formatting checks. Package publication is a
separate maintainer action; do not publish as part of routine verification.
`pnpm publish:dry-run` validates both packages without changing npm state. An
authorized prerelease must use `pnpm publish:alpha`, which passes the `alpha`
tag explicitly rather than relying on a registry's current default tag. Both
paths rebuild the packages before packing; the UI safeguard builds the runtime
first so declarations and executable output cannot be stale or missing.
