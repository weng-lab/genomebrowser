# Testing

Prefer tests through the boundaries consumers use: reader file access, browser and track stores, track modules, and UI workflows. Exercise the real behavior behind that boundary and assert the observable result. This lets internal implementations change without requiring the same behavior to be tested again at every layer.

Choose cases that callers can actually reach through the supported contract. Do not manufacture impossible internal states merely to cover a branch. Rejected inputs and failure behavior at the boundary are still meaningful cases.

Use focused unit tests for calculations, transformations, and other programmatic logic when they isolate a useful behavior or regression. Public-boundary coverage is a preference, not a ban on testing internal functions. Add a test when it protects a distinct behavior; avoid repeating an existing assertion through several helpers or layers.

Use React tests when the behavior depends on hooks, component state, or interactions. Keep deterministic logic testable without rendering a component. For example, test a track-selection workflow through its effect on the track store rather than reproducing MUI's own component behavior.

Core tests should exercise generic browser and module contracts. First-party track behavior belongs in the tracks package's tests, keeping the same ownership boundary as the implementation.

## Render budgets

Render budgets record the exact number of committed renders per component for common browser interactions, using the private `@weng-lab/render-probe` package. Core's budgets are in `packages/core/test/renders/`. Add or update a scenario when a change affects how components subscribe to stores, consume context, or pass props, especially in performance work. Budgets are inline snapshots: a higher count fails the test, and a lower one is accepted with `vitest -u` and reviewed as a smaller number in the diff. The [verify-renders skill](../../.agents/skills/verify-renders/SKILL.md) describes the workflow for measuring, classifying, and reducing renders.

See [Verifying changes](verify.md) for commands and handoff checks.
