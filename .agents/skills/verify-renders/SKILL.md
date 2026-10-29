---
name: verify-renders
description: Use whenever changing, refactoring, or reviewing React components, hooks, contexts, or Zustand store subscriptions in core, tracks, or UI where render behavior could change, when doing performance work, or when asked about re-renders, render counts, or render budgets. Measure and update render budgets with the render-probe package instead of reasoning about renders by inspection.
---

# Verify renders

Render budgets are exact inline-snapshot counts of committed renders. Higher counts fail `pnpm verify`. Core scenarios: `packages/core/test/renders/`. API: [render-probe README](../../../packages/render-probe/README.md). Policy: [testing](../../../docs/contributing/testing.md).

1. Measure before changing (`pnpm core test renders` or the package's render tests).
2. If the interaction has no scenario, add one (`renderWithProbe`, drive via real store actions inside `probe.measure`, `pick` components).
3. Classify each render as necessary (new data/region/config) or wasteful (`report.why`).
4. Fix causes in order: narrower selectors; stable context; avoid new objects/functions as props; state down / children; `memo` last.
5. Update snapshots with `vitest -u` only when every changed number is intended. Report before/after in the PR.
6. Run `pnpm verify` before handoff ([verify](../../../docs/contributing/verify.md)).
