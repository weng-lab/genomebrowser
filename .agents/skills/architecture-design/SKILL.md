---
name: architecture-design
description: Design or review deep modules with clear responsibilities and small seams in genomebrowser. Use before introducing or substantially changing hooks, modules, or abstractions, including before delegating implementation. Excludes small fixes within an established design.
---

# Architecture design

Read [module design](../../../docs/module-design.md), [architecture](../../../docs/architecture.md), [feature placement](../../../docs/feature-placement.md), and [code standards](../../../docs/code_standards.md). Inspect affected implementation and callers. Existing package contents are evidence, not a requirement to preserve the current design.

## Agent workflow

1. Identify the caller's real task and what they must supply or coordinate today.
2. Choose an owner for the complete operation (initiation through cleanup). Show a small TypeScript usage example of the proposed interface; name obligations types omit.
3. For a substantial change, sketch one materially different alternative (different owner or caller burden), including the simplest viable approach. Recommend one design and the deciding tradeoff.
4. Explain how observable behavior will be verified ([testing](../../../docs/contributing/testing.md)).
5. Before delegating implementation, hand off owner, caller example, lifecycle obligations, and verification approach.

During review, check callers for duplicated state and leaked ordering/cleanup the module was meant to own. Do not produce a design document by default for straightforward changes inside a clear ownership model.
