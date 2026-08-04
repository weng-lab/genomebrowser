# Genomebrowser Monorepo

pnpm monorepo for an embeddable React genome browser.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) - the browser runtime.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) - collection and application UI.
- `packages/app` (`@weng-lab/genomebrowser-app`) - the standalone web app.
- `packages/reader` (`@weng-lab/genomic-reader`) - a library for reading genomic data from files.

## Documentation

Root `docs/` is maintainer documentation. Things like design decisions and ADRs go here.

`packages/*/docs/` is user-facing documentation that ships with the package; it must be self-contained.

## Application design

Before designing, implementing, or reviewing application UI in `packages/ui` or `packages/app`, read and follow [`DESIGN.md`](DESIGN.md).

## Contributing

When creating or editing commits, pull requests, or issues, follow
[`CONTRIBUTING.md`](CONTRIBUTING.md) and the corresponding templates in
`.github/`.

## Hard rules

- Never run `pnpm run dev`. The user runs the dev server manually.
- Never invent track URLs in examples — use `"YOUR_URL_HERE"` or existing URLs.
- Zustand store names MUST start with `use` — they are React hooks and the compiler
  treats them as such.
- Do NOT suggest compatibility layers, aliases, temporary exports, to support
  older versions of any package.
- When committing changes to git, if there are any changes not made by you in this session, ask if they should also be added to the commit.
