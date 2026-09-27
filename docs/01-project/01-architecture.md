# Architecture

Genomebrowser is built primarily for embedding in Weng Lab websites. It also supports a standalone browser and developers building their own applications. Real integration needs should guide its design.

Applications should be able to add visualizations, supply data, and configure scientific workflows through public APIs. First-party tracks should cover common formats and let applications reuse their fetchers and renderers. Application-specific behavior should not require changes to the browser's internals.

Prefer deep modules: small, clear interfaces that hide substantial implementation complexity. Judge an interface by how little its caller must understand and coordinate to get useful behavior. A short API is not enough if every application needs complicated setup around it.

Keep responsibilities focused. Core should provide general browser capabilities, first-party tracks should be broadly useful, and applications should own their specific workflows. A feature's usefulness to one website does not mean it belongs in the shared library.

Let experience justify abstractions and shared features. Start with a concrete need, learn from integrating it, and generalize when the responsibility becomes clear. Existing package contents are evidence of how the project developed, not a reason to preserve a boundary that no longer makes sense.

## How the parts fit together

An application composes the browser by creating its browser and track stores, registering track modules, and rendering the core browser. The browser store holds browser state such as the visible region; the track store holds the registered modules and track instances. Application controls and browser-hosted components use those stores to interact with the same browser.

Core coordinates the viewport, track data requests, rendering, and browser interactions. A track module supplies the behavior for its visualization, including fetching, rendering, and configuration validation. This lets first-party and application-owned modules participate through the same contract while hiding their data and rendering details from core.

| Part                    | Role                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`         | Embeddable browser runtime, state, and track-module contracts.                                                                |
| `packages/tracks`       | First-party modules and shared track-specific presentation. Modules use core's public contracts and reader for genomic files. |
| `packages/reader`       | Genomic file reading, usable independently of the browser.                                                                    |
| `packages/ui`           | Navigation, track selection, highlight controls, and chromosome overviews for embedding the browser in existing websites.     |
| `apps/standalone`       | The browser as its own product, with application-specific components and optional reuse of UI-package controls.               |
| `apps/playground`       | Experiments and custom browser compositions used during development.                                                          |
| `packages/create`       | A starter generator for developers building a browser application.                                                            |
| `packages/render-probe` | Internal test utility that measures React render counts for render budgets. Private and unpublished.                          |

Core and reader provide independent foundations. Tracks combines their capabilities; UI supplies controls around the browser. Applications choose the modules and controls that fit their workflows. The standalone app is one such application, not the source of every shared component's requirements.

For decisions about extending these parts, see [Where features belong](02-feature-placement.md).

## Design interfaces that hide coordination

A module is deep when callers can request substantial behavior through a small, understandable interface. Its interface includes everything callers must know: types, ordering requirements, state ownership, error handling, and cleanup. A seam is the point where callers use that interface and behavior can vary behind it.

Give a coherent operation an identifiable owner. Internal functions may divide the implementation, but callers should not have to coordinate its internal steps.

For example, browser panning includes recognizing input, applying temporary movement, committing a genomic region, and recovering from interruption. Splitting these steps across hooks is useful only if their interfaces simplify the work. If multiple hooks track the active pointer and must synchronize how the gesture ends, the split has spread ownership.

Prefer a design tailored to the current responsibility. This internal browser integration supplies state and drawing operations to one interaction owner:

```ts
useBrowserPan({ svg, browserStore, trackWidth, content });
```

The module owns the interaction through completion. This is useful because of the coordination it hides, not because it uses one hook.

### When extraction helps

Keep a separate module when it owns substantial behavior that callers can use without knowing its implementation.

For example, content transforms own SVG positioning and clamping against available data. Panning can request an offset and receive the applied offset without knowing which SVG groups move or how their bounds are combined.

That interface hides useful complexity:

```ts
const appliedOffset = content.setContentOffset(requestedOffset);
```

### When generalization adds work

A generic gesture interface might ask its only caller to supply coordinate conversion, preview, commit, and cancellation callbacks. If that caller must also track whether the gesture started and preserve its initial offset, the interface has left important coordination outside the module.

Start with the domain-specific operation. Introduce a more general seam when actual callers need different behavior and the shared interface reduces their work.

Before keeping an abstraction, ask what happens if it is removed. If coordination disappears, the abstraction may be unnecessary. If useful behavior must be duplicated across callers, it is probably earning its place.

## Make implementation readable

Names should reveal meaningful effects. A function that immediately changes SVG transforms should have a name such as `applyDragOffset`. Use `preview` when the surrounding interface makes clear that it applies temporary visible state.

Comments should explain constraints a reader cannot infer from the statements:

```ts
// Clear the session before releasing capture, because capture loss can
// re-enter termination.
drag = null;
releaseCapture(active);
```

Keep state with the module that owns its transitions. Avoid maintaining the same fact in multiple modules when one can expose the observation callers need.

Handle expected failures explicitly. If cleanup must happen even when an operation throws, express that guarantee with control flow such as `finally`. Do not silently swallow every exception to make a cleanup path appear safe.

Organize functions so a reader can follow the operation. Extract helpers when they name a meaningful step or hide detail; avoid helpers that merely move a statement elsewhere.
