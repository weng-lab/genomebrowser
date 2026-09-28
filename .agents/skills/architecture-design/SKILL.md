---
name: architecture-design
description: Design or review module responsibilities and interfaces before introducing or substantially changing hooks, modules, or abstractions. Use during planning and before delegating implementation. Excludes small fixes within an established design and React-specific implementation details.
---

# Architecture design

Read the repository's [architecture](../../../docs/01-project/01-architecture.md), [feature placement](../../../docs/01-project/02-feature-placement.md), and [module design](../../../docs/01-project/module-design.md) before settling on a design. Use [react-best-practices](../react-best-practices/SKILL.md) for React-specific decisions.

## Before implementation

1. Identify the operation and its owner.
2. Describe what callers must supply, observe, and coordinate.
3. Evaluate proposed seams using the module-design principles.
4. Compare with a simpler alternative suited to the current responsibility.
5. Explain how behavior will be verified through the interface callers use.

Scale this work to the change. A short explanation and a small TypeScript example are usually enough. Do not produce a design document by default.

## During review

Check that the implementation preserves the intended ownership. Look for duplicated state, callbacks that make callers coordinate internal steps, and interfaces whose correct use requires reading their implementation.

Treat structures proposed in issues as designs to evaluate. If an explicit implementation requirement conflicts with a simpler design, explain the tradeoff before changing that requirement.
