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

The private `tests/browser` workspace holds browser workflows spanning these packages.
It uses their public exports; package-owned integration and render-budget tests remain
with their packages. See the [browser test guide](../../tests/browser/README.md).

For decisions about extending these parts, see [Where features belong](02-feature-placement.md).
