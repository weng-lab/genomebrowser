---
name: react-best-practices
description: Use when writing, refactoring, or reviewing React/TypeScript components and hooks for correctness, maintainability, composition, or performance, including React-related Next.js fetching and rendering. Excludes styling-only work and non-React TypeScript.
---

# React best practices

Implement the smallest correct React design that fits this repo.

1. Inspect nearby components, hooks, types, and the installed React/Next versions.
2. Read [code standards](../../../docs/code_standards.md) and, when ownership moves, [feature placement](../../../docs/feature-placement.md) / [module design](../../../docs/module-design.md). Before changing a Next.js app, read that app's `node_modules/next/dist/docs/index.md`.
3. Prefer deriving during render, effects only for external sync, current props unless initial-only is explicit, and abstractions earned from real callers. Memoization is performance, never correctness; check compiler behavior first.
4. For render-count work, use the verify-renders skill.
5. Verify with the repo's lint, typecheck, test, and [verify](../../../docs/contributing/verify.md) commands.

Do not keep a parallel essay on general React inside this skill. Project-specific rules live in the knowledge base.
