# Reader browser benchmark

This private workspace package compares `@weng-lab/genomic-reader` with the patched
`genomic-reader@1.4.10` dependency. It reads four real repository datasets directly from
`downloads.wenglab.org`; it does not proxy requests or add synthetic latency.

Every HTTP range request has unique `gbReader` and `gbRequest` query parameters. This bypasses the
browser HTTP cache and makes per-reader traffic identifiable in a HAR.

## Build and run

From the repository root:

```sh
pnpm --filter @weng-lab/reader-benchmark build
pnpm --filter @weng-lab/reader-benchmark serve
```

To serve the production build instead:

```sh
pnpm --filter @weng-lab/reader-benchmark preview
```

## Capture a Chromium profile and HAR

With the benchmark server running at `http://127.0.0.1:5173`:

```sh
agent-browser --session reader-benchmark open http://127.0.0.1:5173
agent-browser --session reader-benchmark profiler start
agent-browser --session reader-benchmark network har start
agent-browser --session reader-benchmark find role button click --name "Run benchmark"
agent-browser --session reader-benchmark wait --text "Complete:" --timeout 900000
agent-browser --session reader-benchmark profiler stop /tmp/opencode/reader-benchmark-trace.json
agent-browser --session reader-benchmark network har stop /tmp/opencode/reader-benchmark.har
agent-browser --session reader-benchmark console
agent-browser --session reader-benchmark errors
```

The profile is a Chrome Trace Event file. Load it in the Chrome DevTools Performance panel or
Perfetto. The HAR records the uncached range traffic and can be grouped by the `gbReader` query
parameter. Requests also include dataset, mode, size, sample, and prime/measure attribution.

For smaller per-dataset HAR files, add `?dataset=astro-peaks`, `?dataset=ccres`, `?dataset=dnase`, or
`?dataset=h3k4me3` to the page URL. Add `&mode=cold` or `&mode=warm` to make still smaller capture
shards. Without these parameters, the page runs the complete benchmark.
