# Genomebrowser Monorepo

## Refer to Docs

Root `docs/` contains maintainer documentation: ADRs, design notes, style guidance, implementation concepts, and other contributor-facing material.

Package-level `packages/*/docs/` contains user-facing documentation that ships with packages and must be readable from `node_modules`.

Package docs must be self-contained. Do not link upward from `packages/*/docs/` into root `docs/`, because those links break from installed packages.

ALWAYS refer to the relevant root maintainer docs and ADRs before changing package behavior.

After completing a change, check whether it affects documented behavior, APIs, config, or decisions. If so, suggest updates to the relevant maintainer or package docs, naming the specific files. Do not let docs silently drift from the code.

## ADRs are the source of truth

A package's ADR documents are the source of truth for high level decisions. DO NOT stray from them. If you find it necessary, ask first and explain why before doing.

## Never run `pnpm run dev`

User will run the dev server manually.

## Don't hallucinate track URLs

Use `"YOUR_URL_HERE"` or existing URLs when making example track configs.

## Fix State Placement Before Memoizing

Before adding `useMemo`/`useCallback`/`React.memo`, check: is state placed too high (in a parent/root re-rendering siblings that don't need it)? Fix colocation first. Only memoize for a measured expensive computation or to stabilize a prop for a `React.memo` child — not as a default reflex.

## Zustand stores ARE React hooks

The name of a zustand store MUST include "use" at the beginning, as they are React hooks, and must be treated as such by the compilers.

## Read .devserve for server logs

Inside .devserve there are out.log and err.log files. Read them when attempting to diagnose issues where the console would be necessary to read.

## Reference style sheet

Reference docs/style.md for code style guidelines and ALWAYS adhere to them.
