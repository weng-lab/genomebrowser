---
name: architecture-design
description: Design or review deep modules with clear responsibilities and small seams in genomebrowser. Use before introducing or substantially changing hooks, modules, or abstractions, including before delegating implementation. Excludes small fixes within an established design.
---

# Architecture design

Follow [code standards](../../../docs/code_standards.md) and [feature placement](../../../docs/feature-placement.md). Read the affected code and its callers first; they are evidence of the current design, not a requirement to keep it.

1. Name the caller's real task and what callers supply or coordinate today.
2. Choose one owner for the complete operation. Show a short TypeScript example of a caller using it, and name the obligations its types do not show: ordering, lifetime, errors, cleanup.
3. For a substantial change, sketch one materially different alternative, including the simplest that works, and recommend one with the deciding tradeoff.
4. Say how observable behavior will be tested ([testing](../../../docs/contributing/testing.md)).
5. When delegating, hand off the owner, the caller example, the obligations, and the test plan.

In review, look for callers that duplicate state or carry ordering and cleanup the module should own. Skip the design write-up for straightforward changes inside a clear owner.
