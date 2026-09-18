# React performance

## Find the work that matters

Use the affected interaction, profiler, network trace, or bundle report to identify expensive work. Avoid speculative caches and broad memoization. Check whether the project uses React Compiler before manually stabilizing every value or callback. Preserve rendering semantics and current props through every optimization.

Remove redundant derived state and unnecessary subscriptions directly. Add memoization, caches, or deferred rendering when you have identified expensive work and can assess the benefit. A routine component edit does not require a benchmark.

## Reduce subscription and render scope

Subscribe to the smallest external-store value that rendering actually uses, using the store's supported selector and equality conventions. A component showing a threshold may need a boolean rather than the entire changing value. If a value is used only when handling an event, read it then through the supported store API when that preserves the intended timing; rendered output still needs a subscription.

For an existing Zustand store with a numeric `zoom` field, a threshold indicator can select its rendered meaning directly:

```tsx
// Subscribes to every zoom change, though the output is only a boolean.
const zoom = useViewportStore((state) => state.zoom);
const showDetails = zoom >= 10;

// Alternative: store updates only change this selection at the threshold.
const showDetails = useViewportStore((state) => state.zoom >= 10);
```

Use the first form if the UI also displays the numeric zoom. Avoid selectors that allocate a new object on every read unless the store's supported equality mechanism handles it. This example assumes Zustand is already in use; it is not a reason to add it.

Keep unrelated synchronization separate when it has independent dependencies. State ownership and Effect rules live in [State and effects](state-and-effects.md); do not hide reactive dependencies behind refs to reduce renders.

Use lazy state initialization for expensive initial values. Use functional updates when computing new state from previous state. Hoist invariant defaults when identity churn defeats a meaningful optimization; do not hoist instance-owned mutable data.

## Isolate expensive rendering

Create a useful component boundary around expensive output. Add memoization only where stable inputs let it skip meaningful work and the compiler does not already handle it. Avoid custom comparators unless every prop, including callbacks, is accounted for. Do not memoize trivial expressions or depend on memoization for identity or correctness.

For an input driving expensive output, keep the input update urgent. A deferred value or transition can let results lag while input stays responsive, if the installed React APIs support the intended operation. Ensure the expensive subtree can skip the urgent render through compiler optimization or a justified memo boundary. Deferral does not make a long synchronous calculation interruptible; large computations may require chunking or a worker. Communicate stale results when that affects user decisions.

Example for a confirmed slow result list, where the compiler is not already providing the necessary memo boundary. `ResultList` is the existing expensive component:

```tsx
import { memo, useDeferredValue, useState } from 'react';

const DeferredResults = memo(ResultList);

function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <section aria-busy={query !== deferredQuery}>
        <DeferredResults query={deferredQuery} />
      </section>
    </>
  );
}
```

Keep filtering or other expensive derivation inside the deferred subtree; doing it in `Search` would still execute it during urgent input renders. Other props must also stay equal for the memo boundary to skip work. Deferral changes scheduling, not request frequency; use the existing fetching layer for request control. See [React's deferred-rendering guidance](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui).

For long offscreen content, consider virtualization or `content-visibility` based on actual DOM/rendering cost. Verify scrolling, layout sizing, focus, and accessibility behavior. Hiding content and unmounting it have different state and Effect lifetimes; choose intentionally.

## Fetch and load deliberately

Start independent requests together when all are needed. Preserve genuine dependencies, error handling, cancellation, and service concurrency limits. Check cheap local conditions before initiating avoidable remote work.

Reuse the project's fetching and cache layer for deduplication, invalidation, and stale-response handling. Do not introduce SWR or another library solely for its presence in an upstream example.

Load substantial optional features on demand when this reduces initial work. Consider preload on demonstrated user intent if the bandwidth tradeoff is worthwhile. Use statically analyzable import paths and supported typed package exports. Inspect bundler behavior before replacing barrel imports; avoid private deep imports or removing public exports to chase a presumed improvement.

Defer nonessential third-party scripts where their ordering and product requirements allow. Keep essential interaction available during loading and handle load failure.

## Browser boundaries

Deduplicate shared global listeners while retaining per-instance cleanup and ownership. Passive listeners are appropriate only when the handler does not need `preventDefault`. Keep browser-only reads out of server rendering and use the framework's established hydration strategy; suppression of hydration warnings is not a synchronization fix.

## Attribution

Performance topics adapted and condensed from Vercel Engineering's guidance; see [attribution](../SKILL.md#attribution). Version-sensitive implementation details must be checked against installed tooling and authoritative documentation.
