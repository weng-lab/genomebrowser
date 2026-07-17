# State and Effects

## Represent Values Correctly

Decide in this order:

1. Derive a value during rendering when props or state already determine it.
2. Use state when a changing value affects rendering.
3. Use a ref when a value must persist but should not trigger rendering.
4. Share a value outside the component only when component instances should share it.

Do not store a derived value and synchronize it with an Effect. Store stable identity, such as an item ID, rather than a copy of changing source data. Use memoization only for measured performance work, never correctness.

```tsx
// Wrong: redundant state that renders stale for one paint after first/last change
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${first} ${last}`); }, [first, last]);

// Right: derive during rendering
const fullName = `${first} ${last}`;
```

## Place State Deliberately

- Keep state in the lowest component that owns all interactions involving it.
- Lift it only to the least common parent of components that coordinate through it.
- Try composition before adding Context solely to avoid prop forwarding.
- Ask whether two mounted copies should share the interaction. If not, the state is instance-local.

A value must be fully controlled by its parent or owned locally. Do not copy an ordinary prop into state. Name intentional capture-once props `initial*` or `default*`. When an uncontrolled subtree's identity changes, reset it with `key`, not an Effect.

## Apply the Effect Boundary

An Effect synchronizes React with an external system: a browser API, timer, network connection, subscription, external store, or imperative non-React widget. If no external system can be named, remove the Effect.

- Work caused by displaying the component may belong in an Effect.
- Work caused by an interaction belongs in that event handler.
- Keep all consequences of one interaction together.
- Do not use state as an intermediary trigger for an Effect.
- Do not notify a parent or pass data upward through an Effect; change ownership or call the callback in the handler.

Common replacements:

- Derived-state Effect → derive during rendering.
- Reset Effect → `key` or a controlled value.
- Interaction Effect → event handler.
- Effect chain → derivation plus one handler.
- Manual external-store subscription → `useSyncExternalStore`.

## Make Effects Honest

Every Effect must declare all reactive dependencies, clean up retained resources, tolerate setup-cleanup-setup, and prevent obsolete asynchronous work from updating current state. Treat dependency warnings as design feedback rather than suppressing them.

Extract synchronization into a named hook when its mechanics obscure intent or are reused. Do not extract a hook merely to hide a short, clear Effect.

## Sources

React's "You Might Not Need an Effect," Dan Abramov's "Writing Resilient Components," and Kent C. Dodds' state-colocation guidance.
