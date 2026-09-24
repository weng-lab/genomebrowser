---
name: verify-renders
description: Use whenever changing, refactoring, or reviewing React components, hooks, contexts, or Zustand store subscriptions in core, tracks, or UI where render behavior could change, when doing performance work, or when asked about re-renders, render counts, or render budgets. Measure and update render budgets with the render-probe package instead of reasoning about renders by inspection.
---

# Verify renders

Render budgets are exact, inline-snapshot counts of committed renders for common interactions. A higher count fails `pnpm verify`, so an unintended re-render cannot land silently. A lower count is accepted by updating the snapshot and shows up as a smaller number in the diff. Core's budgets live in `packages/core/test/renders/`. The API and counting rules are in [render-probe's README](../../../packages/render-probe/README.md).

## Workflow

1. **Measure first.** Run the relevant budgets before changing code, such as `pnpm core test renders`, or the affected package's render tests. A known baseline is the only way to tell whether a change helped.
2. **Cover the interaction.** If the change affects an interaction that no scenario covers, add one before changing code: mount with `renderWithProbe`, drive the interaction through the store actions an application would call inside `probe.measure`, and snapshot the relevant components with `pick`. Explain above the scenario which store action it exercises.
3. **Classify every render** in the affected snapshots as necessary, meaning the component shows new data, a new region, or new configuration, or as wasteful. Use `report.why(name)` and `console.log(String(report))` to see which prop, state, context, or parent render caused each one. Update the necessary-render comment above the snapshot when that judgment changes.
4. **Fix root causes** in this order of preference, because earlier fixes remove work without adding comparison overhead:
   - Narrow Zustand selectors, or subscribe lower in the tree so that only the component showing a value reads it.
   - Keep context values stable. Move frequently changing values into a store read through selectors.
   - Stop creating new objects and functions during render when they pass through props or context.
   - Move state down, or pass JSX as `children` so that a parent's state change does not re-render them.
   - Use `memo` last, and only when a measurement shows it prevents renders.
5. **Update budgets deliberately.** Run `vitest -u` only after confirming that every changed number is intended. A higher number needs a justification in the PR description. A lower number is a result to report.
6. **Report** a before and after table of changed counts for each scenario in the PR description.
7. Run `pnpm verify` before handoff, following [verifying changes](../../../docs/02-contributing/verify.md).

For broader React design guidance, use the `react-best-practices` skill rather than repeating it here.
