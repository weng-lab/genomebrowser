---
name: react-best-practices
description: Use when writing, refactoring, or reviewing React/TypeScript components and hooks for correctness, maintainability, composition, or performance, including React-related Next.js fetching and rendering. Excludes styling-only work and non-React TypeScript.
---

# React Best Practices

Produce the smallest React implementation that remains correct, readable, maintainable, and responsive as requirements change.

## Workflow

1. Inspect the relevant components, hooks, types, nearby conventions, and installed React version. For performance work, inspect the compiler and build configuration too.
2. Identify the decisions involved and read only the relevant references below. A narrow edit should not trigger a full architecture or performance audit.
3. Implement the simplest design that satisfies the current requirement. Follow project instructions and installed framework documentation for version-sensitive APIs.
4. Verify behavior and run the project's relevant checks. For optimization, compare the affected interaction or resource cost before and after when practical.

During implementation, apply the guidance without narrating a checklist. During review, report concrete correctness, design, or performance risks with preferred replacements, not stylistic nits. During design discussion, do not edit files unless asked. Keep focused changes free of unrelated cleanup.

## Core Principles

- Derive values during rendering when existing props or state determine them; keep owned state at the lowest common owner.
- Effects synchronize with external systems. Keep interaction logic in handlers and dependencies and cleanup honest.
- Props remain current values unless an initial-only contract is explicit. Multiple mounted instances must remain independent.
- Prefer clear domain APIs and composition. Boolean props, render props, and Context are valid when they fit the actual contract.
- Earn abstractions from observed callers and variation; avoid speculative shared frameworks.
- Types express valid states and public contracts; infer straightforward internals.
- Memoization changes performance, never correctness. Consider existing compiler behavior before adding manual memoization.
- Address unnecessary work, fetching waterfalls, and bundle cost before low-level tuning. Apply obvious structural improvements directly; justify added optimization complexity with evidence.
- Version-sensitive APIs must match the installed React, type, and framework versions. Do not mechanically replace ref or Context APIs or adopt new libraries to satisfy a rule.

## References

- **Bundled Next.js documentation:** Before changing a Next.js app, read that app's `node_modules/next/dist/docs/index.md`, then the pages relevant to the change, and heed deprecation warnings. Resolve this path from the app directory. Prefer these installed-version docs over remembered APIs or upstream examples; if unavailable, use official Next.js documentation matching the installed version.
- [State and Effects](references/state-and-effects.md): Read for state, reducers, prop synchronization, refs, Effects, or external subscriptions.
- [Component design](references/component-design.md): Read for component or hook responsibilities, composition, shared abstractions, variants, or provider boundaries.
- [TypeScript contracts](references/typescript-contracts.md): Read when defining or changing props, events, refs, Context, reducers, children, or generic React APIs.
- [React performance](references/react-performance.md): Read for expensive rendering, subscriptions, responsiveness, client fetching, or bundle loading.
- [Next.js performance](references/nextjs-performance.md): Read only for Next.js server/client boundaries, fetching, caching, streaming, or server operations.

## Verification

Use the project's configured lint, typecheck, build, and test commands; do not assume tooling or install it for this skill. Follow any repository verification command. Treat hook dependency warnings as design feedback. Check the behavior affected by the change, including current props, cleanup, and independent instances when relevant. For performance work, report the evidence and any measurement limits without claiming an unmeasured speedup.

Examples illustrate decision boundaries; adapt them to actual callers and project conventions rather than treating them as required APIs.

## Attribution

Composition and performance guidance incorporates rewritten material from [Vercel Engineering's agent skills](https://github.com/vercel-labs/agent-skills). The imported composition and React performance skills each declared `license: MIT`, `metadata.author: vercel`, and version `1.0.0`; these declarations are retained here. No separate license text or copyright notice was present in the imported directories. This consolidated skill is maintained locally.
