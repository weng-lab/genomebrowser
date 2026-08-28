# Genomebrowser Monorepo

pnpm monorepo for an embeddable React genome browser.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) - the browser runtime.
- `packages/tracks` (`@weng-lab/genomebrowser-tracks`) - curated first-party track modules.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) - collection and application UI.
- `packages/reader` (`@weng-lab/genomic-reader`) - a library for reading genomic data from files.
- `apps/standalone` (`@weng-lab/genomebrowser-standalone`) - the deployed standalone web app.
- `apps/playground` (`@weng-lab/genomebrowser-playground`) - experiments and custom browser setups.

## Documentation

Root `docs/` is maintainer documentation. Things like design decisions and ADRs go here.

`packages/*/docs/` is user-facing documentation that ships with the package; it must be self-contained. Ensure you update them as we change public API, behavior and other docs worthy edits.

## Application design

Before designing, implementing, or reviewing application UI in `packages/ui` or `apps/*`, read and follow [`DESIGN.md`](DESIGN.md).

## Contributing

When creating or editing commits, pull requests, or issues, follow
[`CONTRIBUTING.md`](CONTRIBUTING.md) and the corresponding templates in
`.github/`.

## Turborepo

Run build, test, typecheck, lint, and formatting tasks through the root pnpm
scripts so Turborepo can apply the package graph and cache. For a targeted task,
use `pnpm exec turbo run <task> --filter=<package>` rather than invoking the
package task with `pnpm --filter`.

When verifying changes, use `pnpm verify`, which checks and builds all packages and applications. Turborepo caches unchanged tasks.

Read [`docs/turborepo.md`](docs/turborepo.md) before changing package task
scripts, `turbo.json`, cache inputs or outputs, or CI task orchestration.

## Dependency rules

This is not the Next.js you know from training data. API, conventions, and file structure may have changed. Before changing either app, read the installed documentation in the app's `node_modules/next/dist/docs`, starting with `index.md`, and heed deprecation warnings.

## Hard rules

- Never run `pnpm run dev`. The user runs the dev server manually.
- Never invent track URLs in examples — use `"YOUR_URL_HERE"` or existing URLs.
- Zustand store names MUST start with `use` — they are React hooks and the compiler
  treats them as such.
- Do NOT suggest compatibility layers, aliases, temporary exports, to support
  older versions of any package.
- When committing changes to git, if there are any changes not made by you in this session, ask if they should also be added to the commit.
- Changes to packages/core must be track-agnostic. A track may motivate a new core capability, but core must not contain track-specific behavior, types, imports, or exceptions; keep those concerns in packages/tracks.
