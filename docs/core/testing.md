# Testing Guidelines

Run the package command from the repository root, or pass a test file while iterating:

```sh
pnpm --filter @weng-lab/genomebrowser test
pnpm --filter @weng-lab/genomebrowser exec vitest run test/stores/trackStore.test.ts
```

Run first-party module tests in their owning package:

```sh
pnpm --filter @weng-lab/genomebrowser-tracks test
```

## Test taxonomy and locations

Tests live under `packages/core/test` and mirror behavior boundaries rather than individual source files:

- `modules`: module definition, inferred contracts, defaults, and validation
- `stores`: browser, track, settings, and context-menu state transitions
- `data`: request selection, signatures, async results, and error handling
- `browser`: orchestration wiring, viewport calculations, panning, highlights, and track swapping

First-party schema, fetch, rendering, settings, tooltip, and public-export tests live under `packages/tracks/test`. Core tests should cover the generic module and browser contracts without duplicating track-specific cases.

Use pure unit tests for calculations and store transitions. Use React tests only when provider wiring, hooks, effects, or rendered browser behavior is the subject. Prefer asserting public outcomes over implementation details.

## Conventions

- Build track fixtures through `module.create` unless the test intentionally exercises malformed runtime input.
- Use `YOUR_URL_HERE` for placeholder track URLs.
- Assert both the returned mutation result and unchanged state on rejected store updates.
- Cover construction throws separately from mutation-result failures.
- For async request tests, cover stale completion, retained successful data during a later request, and per-track errors where relevant.
- Keep first-party module tests in `packages/tracks/test`; do not make core browser tests duplicate their schema cases.

## Playground example

The former package-level Vite harness is preserved at `apps/playground/examples/core`. It imports the public workspace package specifier, which the playground maps directly to `packages/core/src/lib.ts`. The example is intentionally not connected to an App Router route.

Wire the example into a playground route only for an active manual investigation. You own starting and managing the development server. Automated checks and agents must not start it.

## Debugging failures

Start with the matching behavioral seam: registry/module definition, store validation, request coordination, viewport settlement, or a first-party module. A failure after a config update often involves either schema parsing or a missing/incorrect `fetchOnChange` marker. A panning failure usually requires checking both viewport state and request settlement.

For browser failures that need runtime logs, inspect `.devserve/out.log` and `.devserve/err.log`. Do not start a second development server as part of test diagnosis.
