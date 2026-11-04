---
name: testing
description: Use when deciding whether a change gets a test, writing, reviewing, or deleting tests, updating render snapshots, or when tests pass but behavior is wrong. Applies to every package and the web app. Render-count budgets use verify-renders.
---

# Testing

Read the [testing policy](../../../docs/contributing/testing.md) and apply its decision, boundary, two-edit, and snapshot guidance. Follow it over nearby tests that disagree.

Agent steps:

1. Before writing a new test, break the behavior on purpose, run the test, and confirm the failure message shows the wrong value for the reason you expect. Restore the code.
2. In the handoff and PR, report the test or no-test decision with its one-line reason, and the verification you ran.
3. Follow [verify](../../../docs/contributing/verify.md) before handoff.
