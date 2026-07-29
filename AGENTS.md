# Genomebrowser Monorepo

pnpm monorepo for an embeddable React genome browser.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) - the browser runtime.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) - catalog and application UI.
- `packages/app` (`@weng-lab/genomebrowser-app`) - the standalone web app.
- `packages/reader` (`@weng-lab/genomic-reader`) - a library for reading genomic data from files.

## Documentation

Root `docs/` is maintainer documentation. Things like design decisions and ADRs go here.

`packages/*/docs/` is user-facing documentation that ships with the package; it must be self-contained.

## Hard rules

- Never run `pnpm run dev`. The user runs the dev server manually.
- Read `.devserve/out.log` and `.devserve/err.log` when you need server or
  console output to diagnose an issue.
- Never invent track URLs in examples — use `"YOUR_URL_HERE"` or existing URLs.
- Zustand store names MUST start with `use` — they are React hooks and the
  compiler treats them as such.
