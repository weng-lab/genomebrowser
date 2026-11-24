---
name: verify-renders
description: Ad-hoc render verification with render-probe. Use only when render count or re-render behavior is an important part of a change (such as render performance work, store subscription changes, or failing render-budget snapshots), or when asked to investigate or validate re-renders.
---

# Verify renders

Render budgets are exact inline-snapshot counts of committed renders. Higher counts fail `pnpm verify`. Scenarios: `*.renders.test.tsx` in `packages/core/test/renders/` and under `packages/tracks/test/`. API: [render-probe README](../../../packages/render-probe/README.md). Policy: [testing](../../../docs/contributing/testing.md).

1. Measure before changing (`pnpm core test renders` or the package's render tests).
2. If the interaction has no scenario, add one (`renderWithProbe`, drive via real store actions inside `probe.measure`, `pick` components).
3. Classify each render as necessary (new data/region/config) or wasteful (`report.why`).
4. Fix causes in order: narrower selectors; stable context; avoid new objects/functions as props; state down / children; `memo` last.
5. Update snapshots with `vitest -u` only when every changed number is intended. Report before/after in the PR.
6. Run `pnpm verify` before handoff ([verify](../../../docs/contributing/verify.md)).
