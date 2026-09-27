---
name: architecture-design
description: Design or review module responsibilities and interfaces before introducing or substantially changing hooks, modules, or abstractions. Use during planning and before delegating implementation. Excludes small fixes within an established design and React-specific implementation details.
---

# Architecture design

Read the repository's [architecture](../../../docs/01-project/01-architecture.md) and [feature-placement guidance](../../../docs/01-project/02-feature-placement.md) before settling on a design. Use [react-best-practices](../react-best-practices/SKILL.md) for React-specific decisions.

The goal is a module that owns a coherent responsibility and hides substantial implementation behind an interface callers can understand easily.

## Before implementation

1. Identify the operation and its owner. For an interaction, include its start, temporary state, completion, and interruption.
2. Describe what callers must supply, observe, and coordinate. Include ordering requirements and error handling, not just TypeScript types.
3. Explain each proposed seam. What complexity does it hide? What actual variation requires it?
4. Compare with a simpler design tailored to the current responsibility. Apply the deletion test: would removing a layer eliminate coordination, or force callers to reproduce useful behavior?
5. Identify how tests will exercise behavior through the interface callers use.

Scale this work to the change. A short explanation and a small TypeScript example are usually enough. Do not produce a design document by default.

## During review

Check that the implementation preserves the intended ownership. Look for duplicated state, callbacks that make callers coordinate internal steps, and interfaces whose correct use requires reading their implementation.

Treat structures proposed in issues as designs to evaluate. If an explicit implementation requirement conflicts with a simpler design, explain the tradeoff before changing that requirement.

Do not equate fewer files or functions with better architecture. Internal helpers are useful when they improve readability without spreading ownership.
