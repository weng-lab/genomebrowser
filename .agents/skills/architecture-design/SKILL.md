---
name: architecture-design
description: Design or review deep modules with clear responsibilities and small seams in genomebrowser. Use before introducing or substantially changing hooks, modules, or abstractions, including before delegating implementation. Excludes small fixes within an established design.
---

# Architecture design

Design deep modules with clear responsibilities and small seams. Put substantial behavior behind an interface that callers can understand without learning the implementation. Keep related decisions, state, and lifecycle rules inside the module.

## Design vocabulary

- A **module** has an interface and an implementation. It can be a function, hook, or larger subsystem.
- An **interface** includes everything callers must know: inputs, results, observable effects, ordering, lifetime, errors, and cleanup obligations.
- A **deep module** hides meaningful complexity behind a simple interface. Judge depth by the behavior callers gain relative to what they must learn and coordinate, not by implementation size.
- A **seam** is a place where behavior can be substituted without changing the code that uses it. Keep its contract small by exposing meaningful operations and collaborators while hiding internal steps.

A deep module can contain smaller modules and internal seams. Keep those details private unless callers have a concrete need for them. Fewer methods do not make an interface simpler if callers must coordinate more behavior.

## Ground the design in genomebrowser

Read the repository's [architecture](../../../docs/01-project/01-architecture.md) and relevant [feature placement](../../../docs/01-project/02-feature-placement.md) guidance before choosing ownership. Inspect the affected implementation and its callers to understand the actual constraints.

Use [module design](../../../docs/01-project/module-design.md) for supporting examples and tradeoffs, and [react-best-practices](../react-best-practices/SKILL.md) for React-specific decisions. Existing package contents are evidence, not a requirement to preserve the current design. Keep the work within the requested scope.

## Start with the caller and the complete operation

Identify what the caller is trying to accomplish and what it currently must supply, know, or coordinate. Use a real call site when one exists.

Choose an owner for the complete responsibility. For an interaction, account for initiation, temporary state, completion, interruption, and cleanup. Internal helpers can divide the implementation, but callers should not have to reconstruct the operation or duplicate its state.

Show a small TypeScript usage example for the proposed interface. Explain which decisions and coordination it absorbs, and which obligations remain with the caller. Include ordering or lifetime rules that the types do not express.

## Make each module and seam earn its place

Evaluate the design with these questions:

- What meaningful complexity will this module absorb?
- What complete responsibility does it own?
- What crosses its seams, and why must each part cross?
- Can callers use it without understanding or coordinating internal steps?
- Would a change to one behavior stay with one owner or spread across callers?
- If the module disappeared, would callers need to reproduce its behavior, or would unnecessary handoffs simply disappear?

Prefer interfaces that express the caller's task. Avoid exposing callbacks for every internal step or passing private helpers through the interface.

Justify new seams with concrete variation or a testing need, and module boundaries with coherent responsibilities. Inject meaningful collaborators where useful; do not create an adapter for every dependency. Side effects can belong inside a module when it owns their lifetime and failure handling.

## Explore alternatives when the choice matters

For a substantial responsibility or interface change, sketch a materially different alternative before settling on a design. Change who owns the operation, what the caller supplies, or where coordination happens. Renaming the same arrangement is not an alternative.

Include the simplest viable approach, which may use an existing module. Compare caller usage, hidden complexity, locality of changes, and verification. Recommend a design and explain the tradeoff that decided it.

For a straightforward change within a clear ownership model, keep this brief. Do not expand the task into a broad redesign or produce a design document by default.

Treat structures proposed in issues as designs to evaluate. If an explicit implementation requirement conflicts with a better design, explain the tradeoff before changing that requirement.

## Verify and review through the interface

Explain how callers' observable behavior will be verified, including interruption and failure when they affect the contract. Follow the repository's [testing guidance](../../../docs/02-contributing/testing.md). Focused internal tests can complement checks of the complete operation.

Before delegating implementation, communicate the chosen owner, caller example, lifecycle obligations, and verification approach so those decisions survive the handoff.

During review, check the actual callers as well as the module. Look for duplicated state, leaked ordering or cleanup obligations, and callers that still coordinate behavior the module was intended to own.
