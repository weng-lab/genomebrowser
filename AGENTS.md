# Genomebrowser Monorepo

For package specific scripts, refer to it's package.json file. (build, dev etc.)

## Refer to Docs

ALWAYS refer to docs/${PACKAGE} for up to date ADRs and documentation about said package.

## ADRs are the source of truth

A package's ADR documents are the source of truth for high level decisions. DO NOT stray from them. If you find it necessary, ask first and explain why before doing.

## Never run `pnpm run dev`

user will run the dev server manually.

## Don't hallucinate track URLs

use `"YOUR_URL_HERE"` or existing URLs when making exmple track configs.

## Architecture guidelines

- Build deep modules.
- Import/use each module only at its natural seam.
- Keep the number of integration points low.

## KISS (keep it simple stupid)

Write as little code as possible that still accomplishes the task 100%. More LoC = more technical debt.

## Fix State Placement Before Memoizing

Before adding `useMemo`/`useCallback`/`React.memo`, check: is state placed too high (in a parent/root re-rendering siblings that don't need it)? Fix colocation first. Only memoize for a measured expensive computation or to stabilize a prop for a `React.memo` child — not as a default reflex.

## Zustand stores ARE React hooks

The name of a zustand store MUST include "use" at the beginning, as they are React hooks, and must be treated as such by the compilers.

## Read .devserve for server logs

Inside .devserve there are out.log and err.log files. Read them when attempting to diagnose issues where the console would be necessary to read.

## Reference style sheet

reference docs/style.md for code style guidelines and ALWAYS adhere to them.

## Use vercel skills

Always use the vercel react skills when writing react code to ensure clean readable and performant code.
