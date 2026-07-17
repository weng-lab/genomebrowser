# Component Design

## Preserve Data Flow

Props are current values, not constructor arguments. Do not copy them into state unless their names explicitly declare an initial-only contract. Rendering, Effects, callbacks, and optimizations must all observe current props.

```tsx
type SwatchProps = { color: string };

// Wrong: copies a prop into state, so later `color` changes are silently ignored
function Swatch({ color }: SwatchProps) {
  const [value] = useState(color);
  return <div style={{ background: value }} />;
}

// Right: render the current prop; if capture-once is intended, name it `defaultColor`
function Swatch({ color }: SwatchProps) {
  return <div style={{ background: color }} />;
}
```

Memoization may change performance, never behavior. Avoid custom comparison functions unless every prop, including callbacks, is compared correctly.

## Make Components Resilient

A component must remain correct when its parent renders more or less often than expected. It must not reset drafts, perform visible side effects during rendering, depend on mount timing, or require memoization for correctness.

Assume two copies can be mounted simultaneously. Prevent interference through mutable module state, shared refs, unscoped subscriptions, or global state used for instance-local interactions.

## Design Explicit APIs

Follow project naming conventions. Otherwise, use `on<Event>` for callback props and `handle<Event>` for internal handlers. Domain components should pass the next domain value to callbacks; reserve raw DOM events for thin native-element wrappers.

Data flows down through props and events flow up through callbacks. Keep all consequences of an interaction in one handler.

## Prefer Composition

Use `children` or named slots when callers supply structure. Prefer composition over prop forwarding, Context added only to avoid forwarding, or one component with many unrelated layout and behavior flags.

A boolean prop is valid when it represents one orthogonal choice. Large branches or combinatorial flag behavior usually indicate separate components or composable parts.

## Split by Responsibility

Consider splitting when a region owns independent state, conditional branches represent distinct modes, props mix unrelated concerns, or synchronization obscures intent. Do not split only because a file is long, two components look similar, or extraction merely moves lines.

Never define a component inside another component's render; its identity changes each render and resets its subtree. Hoist it and pass data through props.

A custom hook should name a cohesive React behavior with a stable contract. Do not use hooks as miscellaneous containers or speculative reuse points.

## Sources

Dan Abramov's "Writing Resilient Components," React's "You Might Not Need an Effect," and Kent C. Dodds' composition and colocation guidance.
