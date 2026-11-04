---
name: testing
description: Use when deciding whether a change gets a test, writing, reviewing, or deleting tests, updating render snapshots, or when tests pass but behavior is wrong. Applies to every package and the web app. Render-count budgets use verify-renders.
---

# Testing

Policy: [testing](../../../docs/contributing/testing.md). Read it before you start, and follow it over nearby tests that disagree.

1. Decide whether the change gets a test, and write the one-line reason for the PR: "No test: …" or "Test: …, catches …".
2. Find the boundary in the policy's table. Reuse the package's existing harness and fixtures. Do not add mocks of repository modules.
3. Write expected values as literals from the requirement, not from a run of the code.
4. Break the behavior on purpose, run the test, and check that the failure message shows the wrong value for the reason you expect. Then restore the code.
5. Apply the two-edit check to every test you wrote or touched. Rewrite or delete tests that fail it.
6. If a track snapshot changed, open the old and new SVGs. Update with `vitest -u` only when the visual change is intended, and say so in the PR.
7. Run the package's tests, then follow [verify](../../../docs/contributing/verify.md).

When you report, name the decision and what it changed, for example: "No test: per the testing policy, it would only restate the constant."
