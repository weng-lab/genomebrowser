# React Abstractions

AHA means **Avoid Hasty Abstractions**. Temporary duplication is safer than a shared API whose variation is not understood: duplication stays local, while a wrong abstraction spreads flags, branches, and coupling across callers.

## Earn the Abstraction

1. Solve the current requirement directly.
2. Follow an existing abstraction only when its contract genuinely fits.
3. Compare real callers before extracting shared behavior.
4. Identify the stable responsibility and observed variation.
5. Extract only when the result removes concepts from callers.

Do not use an occurrence count. If the abstraction's name, responsibility, or parameters are unclear, keep the implementations direct.

## Components and Hooks

Extract a component when it creates a useful ownership boundary: local state, a stable UI responsibility, an independently changing region, or a small prop contract. Do not extract only to reduce line count or deduplicate similar JSX.

Extract a hook when it names cohesive React behavior such as interaction state, external synchronization, or a stable state-and-handler contract. Do not gather unrelated state and Effects into a hook merely to shorten a component.

## Watch Configuration Growth

Repeated `variant`, `mode`, layout, and behavior flags can indicate several components hidden behind one API. Prefer separate components, composable parts, named slots, or a small shared primitive when combinations produce unrelated branches.

```tsx
// Wrong: `hasHeader`/`hasFooter` duplicate structure the content already implies
<Panel hasHeader header="Warning" hasFooter footer={<Dismiss />} collapsible />

// Right: content defines structure; the genuine behavior flag stays a prop
<Panel header="Warning" footer={<Dismiss />} collapsible>
  <p>Disk almost full.</p>
</Panel>
```

Individual flags are acceptable when they represent independent choices and keep the contract clear.

## Recover from a Wrong Abstraction

Inline it into its callers, remove branches each caller does not use, compare the concrete results, and extract only the smaller common behavior that becomes evident. Do not repair a collapsing abstraction with another mode flag.

Earlier abstraction is justified when a contract already exists independently, such as a native-element wrapper, accessibility primitive, established design-system primitive, or mandatory shared policy.

## Sources

Kent C. Dodds' "AHA Programming," applied to React components, hooks, and composition.
