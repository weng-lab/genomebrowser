---
name: author-first-party-track
description: Use when adding, implementing, or reviewing a first-party track in packages/tracks. Covers module design, reuse, package integration, tests, and shipped documentation. Do not use for custom downstream track modules.
---

# Author a first-party track

Add a track to `@weng-lab/genomebrowser-tracks` as a complete package feature. Reuse an existing track when its data or presentation contract fits, but do not copy structure that the new track does not need.

## Establish the contract

1. Identify the source format, fetched data shape, configuration, displays, interactions, settings, tooltip, and intended public exports.
2. Inspect the closest existing track and the relevant contracts in `@weng-lab/genomebrowser`.
3. Decide which behavior can be reused. A first-party track may reuse another track's fetch, render, settings, schema, or tooltip code when the contracts genuinely match.

This step is complete when the required behavior, public surface, and deliberate reuse are clear. Do not assume every track needs a unique file for each concern.

## Implement the module

1. Add only the necessary files under `packages/tracks/src/<track>/` for types or schemas, fetching, rendering, settings, and tooltips.
2. Compose the module with `defineTrackModule`. Validate configuration with its schema and wrap configuration that changes fetched data with `fetchOnChange`.
3. Use shared row-layout, signal, settings, tooltip, and coordinate APIs when their contracts apply.
4. Export the module, its create-input and resolved-config types, and only the additional types or helpers users need.
5. Load `react-code-quality` when writing or changing React components or hooks. Load `vercel-react-best-practices` when the work raises React performance concerns.

This step is complete when module creation validates its input and every declared display and optional component has working behavior.

## Integrate the package entry

Account for every applicable integration point:

- `packages/tracks/src/lib.ts` and `firstPartyTrackModules`
- `packages/tracks/package.json` public exports
- `packages/tracks/vite.config.ts` library entries and test aliases
- public API coverage under `packages/tracks/test/`

Do not expose internal implementation files or add compatibility exports. This step is complete when consumers can import the track through its intended package subpath and the aggregate first-party module list includes it.

## Test distinct behavior

Add tests for the behavior the track owns. Cover these categories when applicable:

- creation, defaults, and invalid configuration
- fetch behavior and fetch invalidation
- rendering and interactions for each display
- settings mutations and validation
- tooltip content and formatting
- public package exports

Reuse does not require duplicating another track's tests, but add coverage proving that the new module composes reused behavior correctly. This step is complete when the tests cover the track's distinct behavior and package integration without requiring irrelevant categories.

## Update shipped documentation

Load `genomebrowser-docs` and update all affected package documentation. Usually account for:

- `packages/tracks/README.md`
- `packages/tracks/docs/README.md`
- `packages/tracks/docs/exports.md`
- `packages/tracks/docs/tracks/README.md`
- a self-contained page under `packages/tracks/docs/tracks/`
- data-source troubleshooting when the source has special browser or server requirements

Use public imports and verified behavior. Never invent track URLs. This step is complete when an installed-package user can discover, configure, and troubleshoot the track.

## Verify

From the repository root, run:

```bash
pnpm --filter @weng-lab/genomebrowser-tracks typecheck
pnpm --filter @weng-lab/genomebrowser-tracks test
pnpm --filter @weng-lab/genomebrowser-tracks lint
pnpm --filter @weng-lab/genomebrowser-tracks verify:package
```

Fix failures caused by the change. Report concrete pre-existing or environmental failures rather than weakening tests. The work is complete when implementation, package integration, relevant tests, shipped documentation, and verification are all accounted for.
