---
name: react-code-quality
description: Use when writing, refactoring, or reviewing React/TypeScript components and hooks for readability and maintainability, especially state ownership, Effects, component APIs, abstractions, or React-facing types. Do not use for styling-only work, non-React TypeScript, framework-specific architecture, or performance-only optimization.
---

# React Code Quality

Produce the smallest React implementation that remains readable, maintainable, and correct as requirements change.

## Workflow

1. Inspect the relevant components, hooks, types, and nearby conventions.
2. Identify the decisions involved: state, Effects, responsibilities, APIs, types, or abstraction.
3. Read only the references relevant to those decisions.
4. Implement the simplest design that satisfies the current requirement.
5. Verify the result (see Verify).

Match the requested mode:

- During implementation, apply these rules without narrating a checklist.
- During review, report concrete design risks and preferred replacements, not stylistic nits.
- During design discussion, do not edit files unless explicitly asked.
- Do not expand a focused change into unrelated cleanup.

## Core Checks

- Every state value is necessary and cannot be derived during rendering.
- State lives in the lowest component that owns all uses of it.
- Every Effect names an external system and handles dependencies and cleanup honestly; otherwise it is removed.
- Data flows down through props and up through events; props keep flowing unless an initial-only contract is explicit.
- Multiple mounted instances cannot accidentally interfere.
- APIs express intent without accumulating unrelated flags.
- Types reject states the implementation assumes are impossible; annotate contracts and infer internals.
- New abstractions are justified by observed callers and variation.
- Version-sensitive APIs match the installed React and type versions and follow nearby conventions.

## Verify

- Confirm the Core Checks hold for the changed code.
- Discover and run the project's relevant lint, typecheck, and test commands (e.g. `package.json` scripts); do not assume `tsc` is available or install tooling.
- Where configured, `react-hooks/exhaustive-deps` is the mechanical backstop for Effect dependencies; treat its warnings as design feedback, not noise to suppress.

## Resources

- `references/state-and-effects.md`: State representation, ownership, controlled values, and Effect boundaries. Read when code uses or changes state, reducers, Effects, prop synchronization, refs, or external subscriptions.
- `references/component-design.md`: Data flow, instance isolation, event APIs, composition, and responsibility-based splitting. Read when creating or substantially changing a component or custom hook.
- `references/react-abstractions.md`: React-specific AHA guidance for shared components, hooks, composition, and configuration props. Read when extracting shared code, creating generic React APIs, or adding variants and behavior flags.
- `references/typescript-contracts.md`: React-facing TypeScript contracts for props, state, events, refs, Context, reducers, children, and generic components. Read when defining or changing these types.
