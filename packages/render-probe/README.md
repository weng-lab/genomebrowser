# @weng-lab/render-probe

Measures which React components committed a render, how many times, and why, so tests can hold render counts to exact budgets. It is a private workspace test utility. It is not published and has no build step; consumers import its TypeScript source through `workspace:*`.

The probe mounts a tree and observes every commit through the React DevTools hook, using [bippy](https://github.com/aidenybai/bippy) internally. The code under test needs no changes or instrumentation.

## Setup

Add the package as a development dependency and load its setup module in the vitest config:

```json
"devDependencies": {
  "@weng-lab/render-probe": "workspace:*"
}
```

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ["@weng-lab/render-probe/setup"],
  },
});
```

The setup module installs the DevTools hook, which must exist before `react-dom` loads. A test file cannot do this itself because its imports are hoisted. The module is harmless in `node`-environment test files. Tests that render need `// @vitest-environment jsdom`. `renderWithProbe` throws if the setup module has not run.

## Usage

```tsx
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";

let probe: Probe | undefined;
afterEach(() => probe?.unmount());

it("re-renders only the rows for a region change", async () => {
  probe = await renderWithProbe(
    <GenomeBrowser sizing="fixed" browserStore={browserStore} trackStore={trackStore} />,
  );

  const report = await probe.measure(() => browserStore.getState().setRegion(next));

  expect(report.pick("TrackRow", "TrackControls")).toMatchInlineSnapshot();
});
```

- `renderWithProbe(ui)` mounts `ui` into a new jsdom container with `createRoot`, waits for the mount to settle, and resolves to a probe. It does not wrap the tree in `StrictMode`, which would double renders. Only one probe may be mounted at a time.
- `probe.mounted` reports the initial mount.
- `probe.measure(action)` runs a synchronous or asynchronous `action` inside `act` and reports every commit until effects and immediately resolving promises settle. The probe does not advance fake timers. Advance them inside `action`.
- `probe.rerender(ui)` renders new root props. Call it inside `measure`.
- `probe.unmount()` unmounts the tree and removes its container. Call it in `afterEach`.

A `RenderReport` exposes:

- `counts`: renders per component name, sorted by name.
- `pick(...names)`: `counts` limited to the named components, for focused snapshots. It throws for a name that neither rendered nor is mounted.
- `why(name)`: one entry per rendered instance, such as `{ instance: "Item#a", renders: 1, because: ["props.label"] }`.
- `String(report)`: a table of counts and reasons for debugging.

## What counts

Only committed renders of function, class, `memo`, and `forwardRef` components under the probe count. Host elements, discarded render attempts, bailed-out components, and commits in other React roots do not. Several instances of one component add to the same count.

Names come from `displayName`, then the function or class name. `memo` and `forwardRef` are unwrapped, so a memoized `TrackContent` reports as `TrackContent`. Anonymous components report as `Anonymous`.

`counts` includes every component mounted when the measurement ends, with `0` for components that did not render, plus components that rendered and then unmounted during the measurement.

An instance name is the component name plus the React key path to it, or its index among its siblings when no ancestor is keyed. Its `because` list combines the reasons for all of its renders in the measurement:

| Reason         | Meaning                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `mount`        | The instance mounted.                                                                                                  |
| `props.<name>` | The prop's value changed identity (`!Object.is`). One entry per changed prop.                                          |
| `state`        | Hook or class state changed, including an external store read with `useSyncExternalStore`, such as a Zustand selector. |
| `context`      | A consumed context value changed.                                                                                      |
| `parent`       | Nothing above changed identity. The parent rendered and this component is not memoized.                                |

## Measuring a hook

There is no hook-specific API. Render a small component that calls the hook, then measure that component:

```tsx
// useHookUnderTest stands for the hook being measured.
function HookHost() {
  useHookUnderTest();
  return null;
}

probe = await renderWithProbe(<HookHost />);
const report = await probe.measure(() => browserStore.getState().setRegion(next));
expect(report.counts.HookHost).toBe(1);
```
