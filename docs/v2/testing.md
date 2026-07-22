# Testing Guidelines

Run v2 tests from the repository root:

```sh
pnpm test:v2
```

Run the package command directly, or pass a test file while iterating:

```sh
pnpm --filter @weng-lab/genomebrowser-v2 test
pnpm --filter @weng-lab/genomebrowser-v2 exec vitest run test/stores/trackStore.test.ts
```

## Test taxonomy and locations

Tests live under `packages/v2/test` and mirror behavior boundaries rather than individual source files:

- `modules`: module definition, inferred contracts, defaults, and validation
- `stores`: browser, track, settings, and context-menu state transitions
- `data`: request selection, signatures, async results, and error handling
- `browser`: orchestration wiring, viewport calculations, panning, highlights, and track swapping
- `tracks`: first-party module schemas and track-specific behavior

Use pure unit tests for calculations and store transitions. Use React tests only when provider wiring, hooks, effects, or rendered browser behavior is the subject. Prefer asserting public outcomes over implementation details.

## Conventions

- Build track fixtures through `module.create` unless the test intentionally exercises malformed runtime input.
- Use `YOUR_URL_HERE` for placeholder track URLs.
- Assert both the returned mutation result and unchanged state on rejected store updates.
- Cover construction throws separately from mutation-result failures.
- For async request tests, cover stale completion, retained successful data during a later request, and per-track errors where relevant.
- Keep module tests close to the behavior the module owns; do not make browser tests duplicate every first-party schema case.

## Manual harness

The v2 manual test harness uses the conventional `/api/screen-graphql` route for its Transcript track. The v2 Vite development server proxies that route to SCREEN, rewrites it to `/graphql`, and adds `SCREEN_API_KEY` from the server process or local Vite environment. The key remains server-only and is not exposed through `import.meta.env` or included in the browser bundle.

Set `SCREEN_API_KEY` before starting the development server; without it, SCREEN will reject authenticated requests. You own starting and managing the development server. Automated checks and agents must not start it.

## Debugging failures

Start with the matching behavioral seam: registry/module definition, store validation, request coordination, viewport settlement, or a first-party module. A failure after a config update often involves either schema parsing or a missing/incorrect `fetchOnChange` marker. A panning failure usually requires checking both viewport state and request settlement.

For browser failures that need runtime logs, inspect `.devserve/out.log` and `.devserve/err.log`. Do not start a second development server as part of test diagnosis.
