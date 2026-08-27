# Genomebrowser Monorepo

pnpm monorepo for an embeddable React genome browser.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) - the browser runtime.
- `packages/tracks` (`@weng-lab/genomebrowser-tracks`) - curated first-party track modules.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) - collection and application UI.
- `packages/app` (`@weng-lab/genomebrowser-app`) - the standalone web app.
- `packages/reader` (`@weng-lab/genomic-reader`) - a library for reading genomic data from files.

## Documentation

Root `docs/` is maintainer documentation. Things like design decisions and ADRs go here.

`packages/*/docs/` is user-facing documentation that ships with the package; it must be self-contained. Ensure you update them as we change public API, behavior and other docs worthy edits.

## Application design

Before designing, implementing, or reviewing application UI in `packages/ui` or `packages/app`, read and follow [`DESIGN.md`](DESIGN.md).

## Contributing

When creating or editing commits, pull requests, or issues, follow
[`CONTRIBUTING.md`](CONTRIBUTING.md) and the corresponding templates in
`.github/`.

## Turborepo

Run build, test, typecheck, lint, and formatting tasks through the root pnpm
scripts so Turborepo can apply the package graph and cache. For a targeted task,
use `pnpm exec turbo run <task> --filter=<package>` rather than invoking the
package task with `pnpm --filter`.

When verifying changes, use `pnpm verify`, which will check and build all packages to ensure the app playground is updated with the changes. (It caches some tasks so its not heavy)

Read [`docs/turborepo.md`](docs/turborepo.md) before changing package task
scripts, `turbo.json`, cache inputs or outputs, or CI task orchestration.

## Dependency rules

This is NOT the NextJS you know, it has breaking changes - API, conventions and file structure may all differ from your training data. Read up-to-date documentation in `node_modules/next/dist/docs` (`index.md` for starters) before making any NextJS related changes (applies only to app package). Heed deprecation warnings

## Hard rules

- Never run `pnpm run dev`. The user runs the dev server manually.
- Never invent track URLs in examples — use `"YOUR_URL_HERE"` or existing URLs.
- Zustand store names MUST start with `use` — they are React hooks and the compiler
  treats them as such.
- Do NOT suggest compatibility layers, aliases, temporary exports, to support
  older versions of any package.
- When committing changes to git, if there are any changes not made by you in this session, ask if they should also be added to the commit.
- Changes to packages/core must be track-agnostic. A track may motivate a new core capability, but core must not contain track-specific behavior, types, imports, or exceptions; keep those concerns in packages/tracks.
