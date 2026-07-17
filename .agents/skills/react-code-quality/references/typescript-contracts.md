# React TypeScript Contracts

## Annotate Contracts, Infer Internals

Usually annotate component props, Context values, reducer state and actions, reusable hook inputs, and exported contracts. Usually infer local variables, JSX returns, inline event parameters, and intermediate transformations.

Annotate state when its initial value is narrower than its valid values, such as `useState<User | null>(null)` or `useState<Item[]>([])`.

Prefer typing a component's props parameter directly. `React.FC` is acceptable when established by the project; do not churn either style without a functional reason.

## Encode Valid States

- Use discriminated unions for distinct states such as idle, loading, success, and error.
- Use unions of prop shapes for mutually exclusive component modes.
- Model absence honestly instead of asserting placeholders such as `{} as User`.
- Prefer narrowing to assertions; treat `as any` as a defect unless an unavoidable boundary explains it.

```tsx
// Wrong: optional flags permit contradictory combinations like loading + error + data
type Props = { isLoading?: boolean; error?: Error; data?: User };

// Right: a discriminated union rejects the impossible combinations
type Props =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: User };
```

## Reuse React Types

- Native wrapper props: `React.ComponentPropsWithoutRef<'button'>`.
- Renderable children: `React.ReactNode`.
- Events: `React.ChangeEvent<HTMLInputElement>`.
- Handlers: `React.ChangeEventHandler<HTMLInputElement>`.
- Styles: `React.CSSProperties`.
- Refs: the most specific DOM element type available.

Follow the installed React version for ref APIs. Do not mechanically introduce or remove `forwardRef`.

Inline JSX handlers receive contextual typing. Higher-level components should expose domain values in callbacks; raw DOM events belong in thin DOM wrappers.

## Context, Reducers, and Generics

When Context has no meaningful default, create it as `T | null` and expose a guarded hook that throws a clear missing-provider error. Do not fabricate a default or use `null!`.

Model reducer actions as discriminated unions and use an exhaustive `never` check when missing a case would be unsafe.

Use a generic when a caller-provided type flows between multiple parts of one API, such as items and `renderItem`. A parameter used once, never inferred, or added to avoid choosing a domain type is probably unnecessary. In TSX generic arrow functions, use `<T,>` when needed to distinguish the generic from JSX.

Use type aliases and interfaces according to functional needs and project convention. Prefer unions for alternatives; avoid unrelated conversion churn.

## Sources

The React TypeScript Cheatsheet, React's type surface, Sentry's TypeScript guidance, and Total TypeScript material.
