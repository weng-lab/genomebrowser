# Conventions

Code conventions for this repository. Applies to all new code.

## Naming

Files, folders, and private variables that are not named after a component are
camelCase. Component names and their files are PascalCase.

Applies to all new files and folders that aren't auto-generated or named
specifically by another library, package, script, etc.

## Component composition

Compose components such that their main entry point is mainly orchestration.
The main component should be easy to reason about and be less than 300 lines
long. No index.ts or barrel imports.

## Fix state placement before memoizing

Before adding `useMemo`/`useCallback`/`React.memo`, check: is state placed too
high (in a parent/root re-rendering siblings that don't need it)? Fix
colocation first. Only memoize for a measured expensive computation or to
stabilize a prop for a `React.memo` child — not as a default reflex.
