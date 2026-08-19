# Weng Lab Genome Browser

This pnpm monorepo contains the coordinated `2.0.0-alpha` generation of the
Weng Lab Genome Browser. The packages are prereleases and are not intended to
replace an npm `latest` release. Any publication must retain the configured
`alpha` dist-tag.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) is the embeddable React runtime.
  It renders genomic tracks and owns the browser state and extension APIs.
- `packages/tracks` (`@weng-lab/genomebrowser-tracks`) provides the curated,
  MUI-based BigBed, BigWig, BulkBed, CAVE, MethylC, and Transcript modules.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) provides optional, higher-level
  application controls that depend on the runtime. Applications that only need
  the browser do not need this package.
- `packages/app` (`@weng-lab/genomebrowser-app`) is the standalone web application.
- `packages/reader` (`@weng-lab/genomic-reader`) provides format-independent
  TypeScript contracts for reading genomic data by region.

User-facing documentation is shipped from each package's `docs/` directory.
Repository decisions and contributor guidance live in the root `docs/`
directory and `AGENTS.md`.

## Setup

Use the pnpm version declared in `package.json`, then install the single
workspace dependency graph from the repository root:

```sh
pnpm install --frozen-lockfile
```

The workspace packages use the root Oxlint and Oxfmt installations and pin
their framework and TypeScript dependencies in their own manifests.

## Commands

Run commands from the repository root. Recursive commands run in every
workspace project that defines the corresponding script. Use a package filter
for a focused check.

| Task             | Workspace           | Core                                                 | Tracks                                                      | UI                                                      |
| ---------------- | ------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Build            | `pnpm build`        | `pnpm --filter @weng-lab/genomebrowser build`        | `pnpm --filter @weng-lab/genomebrowser-tracks build`        | `pnpm --filter @weng-lab/genomebrowser-ui build`        |
| Test             | `pnpm test`         | `pnpm --filter @weng-lab/genomebrowser test`         | `pnpm --filter @weng-lab/genomebrowser-tracks test`         | `pnpm --filter @weng-lab/genomebrowser-ui test`         |
| Lint             | `pnpm lint`         | `pnpm --filter @weng-lab/genomebrowser lint`         | `pnpm --filter @weng-lab/genomebrowser-tracks lint`         | `pnpm --filter @weng-lab/genomebrowser-ui lint`         |
| Check formatting | `pnpm format:check` | `pnpm --filter @weng-lab/genomebrowser format:check` | `pnpm --filter @weng-lab/genomebrowser-tracks format:check` | `pnpm --filter @weng-lab/genomebrowser-ui format:check` |

Human maintainers can use a package's targeted development command to start its project.
Automation agents must not start the development servers; inspect
`.devserve/out.log` and `.devserve/err.log` when diagnosing a server already
started by a user.

Set `SCREEN_API_KEY` in the app's local environment for transcript data. The app
reads the key only in its server-side SCREEN GraphQL proxy; the key is not
exposed to browser code.

Before submitting a change, run the relevant targeted commands followed by
the root build, test, lint, and formatting checks. Package publication is a
separate maintainer action; do not publish as part of routine verification.
`pnpm publish:dry-run` validates the publishable packages without changing npm state. An
authorized prerelease must use `pnpm publish:alpha`, which passes the `alpha`
tag explicitly rather than relying on a registry's current default tag. Both
paths rebuild the packages before packing; package safeguards build required
workspace dependencies first so declarations and executable output cannot be stale or missing.
