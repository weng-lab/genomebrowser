# Browser workflows

Use this private workspace for repeatable manual checks that depend on a real browser:
file loading through to the drawing, pointer hit testing, hover, and responsive display.
Playwright owns test discovery, isolated browser contexts, assertions, headed runs, and
failure artifacts. The Vite app uses built public package exports and local genomic data.

## Run or watch

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm browser exec playwright install --with-deps chromium
pnpm test:browser
```

The root command builds the required packages and runs all discovered workflows. It runs
separately from `pnpm verify`, which does not provision Chromium. On a machine with
Chromium's system dependencies installed, omit `--with-deps`.

After the first build, use Playwright directly to select, watch, or debug tests:

```sh
pnpm browser test:e2e --ui
pnpm browser test:e2e --headed
pnpm browser test:e2e navigation
pnpm browser test:e2e --repeat-each=3
```

UI mode lists the scenarios, lets you run them individually, and shows each action and
assertion. Use `--debug` to step through a test. Direct package commands use the existing
builds; rerun `pnpm test:browser` after changing production packages.

For hands-on exploration, `pnpm browser:dev` builds dependencies and leaves the fixture
app running at <http://127.0.0.1:4178>. Drag the signal plot and watch the visible region,
hover signal blocks, or follow the links to dynseq and core interactions. Stop that
server before running automated tests, which start their own server on the same port.
While the manual server is running, `pnpm browser exec playwright codegen http://127.0.0.1:4178`
can record actions to use as a starting point for a new scenario. Add meaningful assertions
and local fixtures before keeping the generated test.

## Workflows

- `scenarios/bigwig.spec.ts`: real BigWig loading, positive and negative signal geometry,
  an empty gap, and the hovered signal value.
- `scenarios/navigation.spec.ts`: actual pointer dragging changes the public region and
  keeps the hovered value aligned with the drawing after the pan. Core owns this behavior.
- `scenarios/dynseq.spec.ts`: the existing dynseq checks, including sequence zoom, sparse
  glyph dimensions, thresholds, resize, negative scores, dense display, shared settings,
  and reference independence. Named steps make the longer workflow inspectable in UI mode.

- `scenarios/core-selection.spec.ts`: zoom, reverse highlights, repeated selections,
  ruler gestures, Escape cancellation, selection hit testing, guides, and margin controls.
- `scenarios/core-reorder.spec.ts`: live drag previews, moves in both directions, pinned
  track boundaries, and the margin's move controls.
- `scenarios/core-settings-menu.spec.ts`: keyboard-opened settings, edits, scrolling,
  dragging, viewport resizing, context-menu targeting, and page, panel, and menu scrolling.
- `scenarios/core-tooltip.spec.ts`: measured SVG bounds at corners, nonzero content origins,
  fit thresholds, resized content and plots, scaled overlays outside compact browsers,
  viewport fitting, and dismissal on scrolling or resizing.
- `scenarios/core-errors.spec.ts`: rejected module fetches in 10px and 60px rows, real error
  scrolling, neighboring track bounds, and preventing error-text drags from panning.

The core scenarios use `/core.html`, a small public custom module and browser stores.
Its controls and outputs are also available for manual exploration. Add `?ruler`, `?errors`,
or `?panel` for the ruler, short error tracks, or a scrolling host panel. Use
`?region=lower`, `?region=upper`, or `?region=base` to explore chromosome boundaries. The tooltip cases
use `origin`, `tooltipWidth`, and `tooltipHeight` query parameters. These are fixture
options, not production APIs. Add `?compact&scale=2` for a short browser at twice its
logical size.

These workflows replace the private tooltip-position, error-layout, default-settings-modal,
context-menu geometry, track-control pinning, and swap-math suites. Selection gestures and
geometry also move here. Private checks for impossible dimensions,
listener bookkeeping, and isolated keyboard behavior are removed. Four fast selection
cancellation cases remain because they protect stale commits and React layout-effect
timing. Public settings-update and async integration tests stay in core. Keep those data
and timing permutations in fast tests.

## Add a workflow

Add a `*.spec.ts` file under `scenarios/`; Playwright discovers it automatically. Import
`test` and `expect` from `./test` to fail on browser errors and block live endpoints.
Use standard Playwright locators, mouse input, and retrying assertions. No registry or
runner changes are needed. For example, a test can navigate to `/`, perform a gesture,
and assert `page.getByRole("status", { name: "Visible region" })` has the expected text.

Reuse a page in `app/` or add a small HTML/React page composed from public package APIs.
Add workspace dependencies to this package when testing other packages. `server.mjs`
serves reader's [BigWig fixture](../../packages/reader/test/fixtures/bigwig/README.md) over
HTTP range requests and generates the existing deterministic dynseq 2bit fixture. Extend
that file when a workflow needs more local data. Keep the reader and rendering real.

Prefer accessible locators and observable outcomes. `signal.ts` contains the SVG plot
locator shared by the first two scenarios; drawing-specific assertions may need updating
if the rendering technology changes. Avoid arbitrary sleeps and internal state probes.
Keep detailed data permutations and async ordering cases in fast integration tests.
Before keeping a workflow, deliberately break its behavior, confirm it fails, and restore
it. A shifted signal and a suppressed pan commit must fail these initial workflows.

## Inspect failures

Playwright saves screenshots and traces for failed tests under `test-results/`, with an
HTML report in `playwright-report/`. Both directories are inside this workspace and ignored
by Git. Open a local report with `pnpm browser exec playwright show-report`, or a trace with
`pnpm browser exec playwright show-trace PATH_TO_TRACE_ZIP`.

CI runs the same root command and uploads both directories as `browser-failures` for 14
days. Tests have no automatic retries, so a flaky failure stays visible. See Playwright's
[UI mode](https://playwright.dev/docs/test-ui-mode) and
[trace viewer](https://playwright.dev/docs/trace-viewer) guides for inspection controls.
