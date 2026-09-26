# Browser tests

These automated pages exercise public package APIs in Chromium with local genomic files.
They reuse the dynseq Vite server and HTTP range fixtures. They do not use the playground
or live data services. Each scenario gets a fresh browser session and server on an
OS-assigned port, with a 1000 × 800 viewport and navigation restricted to loopback.

## Setup and execution

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm tracks exec agent-browser install --with-deps
pnpm test:browser
```

On systems with Chromium's dependencies already installed, omit `--with-deps`.
The CLI is pinned in tracks' development dependencies. `pnpm test:browser` builds core,
reader, and tracks through Turbo before running the tests against their public package
exports. It always runs the browser scenarios, even when the builds are cached.

After a build, run selected scenarios directly:

```sh
pnpm tracks test:e2e bigwig navigation
pnpm tracks test:e2e dynseq
```

The `Browser workflows` CI job provisions Chromium and runs the same root command.
Browser tests remain separate from `pnpm verify`, which does not provision Chromium.

## Scenarios and ownership

- `bigwig.e2e.mjs` loads reader's real `basic.bw` through the BigWig module. It checks
  that the rendered signal contains the +7 and -8 blocks at their genomic positions
  and leaves a fixture gap empty. SVG hit tests use screen coordinates and the real
  drawing transform, without depending on serialized path strings.
- Core's `test/browser/navigation.e2e.mjs` drags the plot with actual mouse input.
  It checks that the visible region changes from `chr1:190-790` to `chr1:310-910`
  through the page's public browser-store subscription.
- `dynseq.e2e.mjs` preserves the existing signal parity, sequence zoom, sparse glyph
  widths, thresholds, resize, negative scores, dense display, and reference independence
  checks. Its page also imports public package exports.

`foundation.tsx` composes `GenomeBrowser`, the public stores, and `bigWigModule`.
`main.tsx` contains the dynseq page. Fixture provenance and regeneration instructions
live with reader's [BigWig fixtures](../../../reader/test/fixtures/bigwig/README.md).
The server also generates the existing deterministic 2bit sequence for dynseq.

## Failures

A failing scenario exits nonzero and saves `failure.png`, a Chrome DevTools trace
in `trace.json`, command and fixture-request history, and available browser errors
and console output under `packages/tracks/test-results/browser/<scenario>/`.
Load the trace in Chrome DevTools' Performance panel. CI uploads this directory as
`browser-failures` for 14 days. Successful scenarios discard their artifacts; rerunning
a scenario replaces its previous artifacts. Unexpected page errors fail the run.

## Add a scenario

Keep generic navigation and browser contracts in `packages/core/test/browser/` and
first-party track behavior here. Export a scenario function and register it in
`run.mjs`. Use an existing page when it represents the workflow, or add a small page
that composes public package APIs. Extend `server.mjs` for additional checked-in
fixtures; keep its range responses faithful to HTTP file access.

Drive real input through the supplied `browser` command and observe rendered output,
public callbacks, or page controls subscribed to public stores. Use condition-based
waits for the outcome. Do not add arbitrary delays, private store reads, synthetic
DOM events, or mocked readers and renderers. Keep data permutations and asynchronous
ordering cases in fast integration tests.

Before accepting a scenario, temporarily break the behavior it protects, rebuild the
affected package, and confirm the scenario fails. For these initial workflows, removing
the BigWig signal paths must fail `bigwig`; suppressing the pan commit must fail
`navigation`. Restore the changes, rebuild, and rerun. Preserve existing gesture and
geometry tests until equivalent browser scenarios pass.
