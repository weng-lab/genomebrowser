# Genomebrowser Monorepo

pnpm monorepo for an embeddable React genome browser.

## Package map

- `packages/core` (`@weng-lab/genomebrowser`) — the browser runtime.
- `packages/ui` (`@weng-lab/genomebrowser-ui`) — catalog and application UI.

These are the only workspace packages.

Root `docs/` is maintainer documentation. `packages/*/docs/` is user-facing
documentation that ships with the package; it must be self-contained — never
link from it into root `docs/` (those links break in `node_modules`).

## When to read what

- Writing or editing code → `docs/conventions.md`. Always adhere to it.
- Changing package behavior or architecture → the package's concepts doc and
  ADRs (`docs/core/`, `docs/ui/`). ADRs are the source of truth — do not
  stray from them; if a change requires it, stop and ask first, explaining why.
- Writing or changing tests → `docs/core/testing.md` / `docs/ui/testing.md`.
- Unfamiliar domain terms → `docs/core/GLOSSARY.md`, `docs/ui/GLOSSARY.md`.
- Creating or updating documentation → load the `genomebrowser-docs` skill.

## Documentation is part of every change

If a change affects public behavior, APIs, configuration, or contributor
guidance, the docs update ships in the same change — never as a follow-up.
In your final response, name the docs files updated or state why the change
has no documentation impact.

## Hard rules

- Never run `pnpm run dev`. The user runs the dev server manually.
- Read `.devserve/out.log` and `.devserve/err.log` when you need server or
  console output to diagnose an issue.
- Never invent track URLs in examples — use `"YOUR_URL_HERE"` or existing URLs.
- Zustand store names MUST start with `use` — they are React hooks and the
  compiler treats them as such.
- `TODO.md` files are the user's prioritized lists. Only modify when
  explicitly asked.
