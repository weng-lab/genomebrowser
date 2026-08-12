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
- `packages/reader` (`@weng-lab/genomic-reader`) provides format-independent
  TypeScript contracts for reading genomic data by region.

## App map

- `apps/next` (`@weng-lab/genomebrowser-next-app`) is the Next.js comparison
  host.
- `apps/tanstackStart` (`@weng-lab/genomebrowser-tanstack-start-app`) is the
  TanStack Start comparison host.

The apps provide behaviorally matched genome browser experiences for framework
comparison. Both are private workspace applications and are not published.

User-facing documentation is shipped from each package's `docs/` directory.
Repository decisions and contributor guidance live in the root `docs/`
directory and `AGENTS.md`.

## Setup

Use the pnpm version declared in `package.json`, then install the single
workspace dependency graph from the repository root:

```sh
pnpm install --frozen-lockfile
```

The reusable packages use the root Oxlint and Oxfmt installations. Each
comparison app pins its own formatter, linter, framework, and TypeScript
dependencies so the hosts can be evaluated independently.

## Commands

Run commands from the repository root. Recursive commands run in every
workspace project that defines the corresponding script; append `:core` or
`:ui` to target one reusable package.

| Task             | Workspace           | Runtime only             | UI only                |
| ---------------- | ------------------- | ------------------------ | ---------------------- |
| Build            | `pnpm build`        | `pnpm build:core`        | `pnpm build:ui`        |
| Test             | `pnpm test`         | `pnpm test:core`         | `pnpm test:ui`         |
| Lint             | `pnpm lint`         | `pnpm lint:core`         | `pnpm lint:ui`         |
| Check formatting | `pnpm format:check` | `pnpm format:check:core` | `pnpm format:check:ui` |
| Apply formatting | `pnpm format`       | `pnpm format:core`       | `pnpm format:ui`       |

Human maintainers can use `pnpm dev` to start all workspace development servers
concurrently, or a targeted development command to start one project.
Automation agents must not start the development servers; inspect
`.devserve/out.log` and `.devserve/err.log` when diagnosing a server already
started by a user.

Use the app-targeted commands to run or build one comparison host:

| Host           | Development server        | Build                       |
| -------------- | ------------------------- | --------------------------- |
| Next.js        | `pnpm dev:next`           | `pnpm build:next`           |
| TanStack Start | `pnpm dev:tanstack-start` | `pnpm build:tanstack-start` |

Set `SCREEN_API_KEY` in the selected app's local environment for transcript
data. Each host reads the key only in its server-side SCREEN GraphQL proxy; the
key is not exposed to browser code.

Before submitting a change, run the relevant targeted commands followed by
the root build, test, lint, and formatting checks. Package publication is a
separate maintainer action; do not publish as part of routine verification.
`pnpm publish:dry-run` validates both packages without changing npm state. An
authorized prerelease must use `pnpm publish:alpha`, which passes the `alpha`
tag explicitly rather than relying on a registry's current default tag. Both
paths rebuild the packages before packing; the UI safeguard builds the runtime
first so declarations and executable output cannot be stale or missing.
