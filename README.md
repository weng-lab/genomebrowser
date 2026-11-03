# Weng Lab Genome Browser

This pnpm monorepo contains independently versioned packages for the Weng Lab Genome Browser. See the [release guide](docs/tooling/releases.md) for version selection and publication.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) is the embeddable React runtime.
  It renders genomic tracks and owns the browser state and extension APIs.
- `packages/tracks` (`@weng-lab/genomebrowser-tracks`) provides the
  MUI-based BigBed, BigWig, BulkBed, CAVE, cCRE BigBed, MethylC, Gene, BAM,
  dynseq, and Ruler modules.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) provides optional, higher-level
  application controls that depend on the runtime. Applications that only need
  the browser do not need this package.
- `packages/reader` (`@weng-lab/genomic-reader`) provides format-independent
  TypeScript contracts for reading genomic data by region.
- `packages/create` (`@weng-lab/create-genomebrowser`) creates an editable
  browser application with the stable v2 packages.

Applications and their private shared packages live under `apps/`:

- [Web app](apps/web/README.md) (`@weng-lab/web`) owns the browser, collections, and settings routes, browser session, workspace layout, and command proxy.
- [Browser server](apps/server/README.md) (`@weng-lab/mcp`) is the optional MCP server. It relays agent commands to connected browser tabs and stores nothing.
- [App contracts](apps/contracts/README.md) (`@weng-lab/contracts`) provides command definitions, wire schemas, and the shared region schema for both apps.

Archived applications live in `legacy/playground` and `legacy/standalone`. They are excluded from the pnpm workspace and its development and verification commands.

See the [maintainer docs](docs/README.md) and [contribution guide](docs/contributing/README.md) for repository guidance.

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

Use Node.js 24 or newer for the browser server. Start the web app and persistent command relay together:

```sh
pnpm dev
```

Open `http://localhost:3000/browser`. `pnpm dev:web` and `pnpm dev:server` start each process separately. Local access requires no token or login. Session IDs select sessions and are not credentials. The [web app guide](apps/web/README.md) covers local setup, remote control, adding pages and commands, and cloud hosting.

The workspace packages use the root Oxlint and Oxfmt installations and pin
their framework and TypeScript dependencies in their own manifests.

## Commands

Run `pnpm verify` from the repository root for the usual workspace check. It runs
formatting checks, lint, builds, and tests. Use the individual commands below for
focused work.

Turborepo runs each task in the workspace
projects that define it, follows package dependencies, and reuses results from
its local cache. See the [build orchestration guide](docs/tooling/builds.md) for
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
