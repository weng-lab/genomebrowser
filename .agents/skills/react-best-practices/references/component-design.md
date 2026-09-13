# Component Design

## Preserve Data Flow

Rendering and callbacks must observe current props. For controlled values, initial defaults, and reset behavior, see [State and Effects](state-and-effects.md).

## Make Components Resilient

A component must remain correct when its parent renders more or less often than expected. It must not reset drafts, perform visible side effects during rendering, depend on mount timing, or require memoization for correctness.

Assume two copies can be mounted simultaneously. Prevent interference through mutable module state, shared refs, unscoped subscriptions, or global state used for instance-local interactions.

## Design Explicit APIs

Follow project naming conventions. Otherwise, use `on<Event>` for callback props and `handle<Event>` for internal handlers. Domain components should pass the next domain value to callbacks; reserve raw DOM events for thin native-element wrappers.

Data flows down through props and events flow up through callbacks. Keep all consequences of an interaction in one handler.

## Prefer Composition

Choose the smallest API that expresses what callers actually vary:

| Caller need | Starting point |
| --- | --- |
| Supply a value or one independent behavior, such as `disabled` | Ordinary props, including booleans |
| Supply content or layout | `children` or named React-node slots |
| Render using data supplied by the component | A render callback, such as `renderItem(item)` |
| Arrange cooperating parts with shared interaction state | Compound components with a scoped provider when props are insufficient |
| Select substantially different workflows | Separate domain components, sharing proven primitives |

Prop forwarding is normal for thin wrappers. Introduce composition when it simplifies callers or ownership, rather than to eliminate every forwarded prop. See Configuration Growth below for flags that duplicate structure.

## Split by Responsibility

Consider splitting when a region owns independent state, conditional branches represent distinct modes, props mix unrelated concerns, or synchronization obscures intent. Do not split only because a file is long, two components look similar, or extraction merely moves lines.

Never define a component inside another component's render; its identity changes each render and resets its subtree. Hoist it and pass data through props.

A custom hook should name a cohesive React behavior with a stable contract. Do not use hooks as miscellaneous containers or speculative reuse points.

## Earn Shared Abstractions

AHA means **Avoid Hasty Abstractions**. Temporary duplication is safer than a shared API whose variation is not understood: duplication stays local, while a wrong abstraction spreads flags, branches, and coupling across callers.

### Extraction Decisions

1. Solve the current requirement directly.
2. Follow an existing abstraction only when its contract genuinely fits.
3. Compare real callers before extracting shared behavior.
4. Identify the stable responsibility and observed variation.
5. Extract only when the result removes concepts from callers.

Do not use an occurrence count. If the abstraction's name, responsibility, or parameters are unclear, keep the implementations direct.

### Configuration Growth

Repeated `variant`, `mode`, layout, and behavior flags can indicate several components hidden behind one API. Prefer separate components, composable parts, named slots, or a small shared primitive when combinations produce unrelated branches.

```tsx
// Wrong: `hasHeader`/`hasFooter` duplicate structure the content already implies
<Panel hasHeader header="Warning" hasFooter footer={<Dismiss />} collapsible>
  <p>Disk almost full.</p>
</Panel>

// Right: content defines structure; the genuine behavior flag stays a prop
<Panel header="Warning" footer={<Dismiss />} collapsible>
  <p>Disk almost full.</p>
</Panel>
```

### Recovering from a Wrong Abstraction

Inline it into its callers, remove branches each caller does not use, compare the concrete results, and extract only the smaller common behavior that becomes evident. Do not repair a collapsing abstraction with another mode flag.

Earlier abstraction is justified when a contract already exists independently, such as a native-element wrapper, accessibility primitive, established design-system primitive, or mandatory shared policy.

## Compound Components and Provider Boundaries

For example, an existing compound API can let callers choose actions without adding layout flags:

```tsx
<Editor.Provider documentId={documentId}>
  <Editor.Frame>
    <Editor.Input />
    <Editor.Toolbar>
      <SaveButton />
    </Editor.Toolbar>
  </Editor.Frame>
  <Preview />
</Editor.Provider>
```

Here `Preview` can share editor state because it is inside the provider; it need not be inside the visual frame. Scope each provider to the interaction it owns so separate editors remain independent. Do not introduce this structure for a component adequately served by ordinary props.

When multiple real state implementations must serve the same UI, let a provider adapt them to a small domain contract. Consumers should not need to know which storage hook implements it. Grouping values as `state`, `actions`, and `meta` is optional; avoid a generic framework or exposing raw setters when domain actions communicate intent better. Keep missing-provider checks explicit; see [TypeScript contracts](typescript-contracts.md).

## Sources

Retains the local guidance based on Dan Abramov's "Writing Resilient Components," React's "You Might Not Need an Effect," and Kent C. Dodds' composition, colocation, and AHA guidance. Compound-component and provider-boundary guidance is adapted from Vercel Engineering; see [attribution](../SKILL.md#attribution).
