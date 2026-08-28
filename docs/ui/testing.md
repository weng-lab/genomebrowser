# UI testing

Run UI package checks from the repository root:

```sh
pnpm --filter @weng-lab/genomebrowser-ui test
pnpm --filter @weng-lab/genomebrowser-ui build
pnpm --filter @weng-lab/genomebrowser-ui lint
pnpm --filter @weng-lab/genomebrowser-ui format:check
```

The test command runs Vitest once. The build also checks TypeScript and package entry points. Do not use the development server as an automated check.

## Test categories

Keep deterministic collection transformations in focused unit tests. Component or integration tests should cover behavior that depends on React state, MUI events, or the runtime track store.

Current automated coverage includes:

- `test/collectionSchema.test.ts`: registry-derived collection validation, module defaults, generated JSON Schema, and empty-registry errors
- `test/collectionColumns.test.tsx`: generated cells, collection-scoped overrides, and value markers
- `test/collectionDefaults.test.ts`: ordered draft transformations, default reconciliation, and invalid default IDs
- `test/trackSelectWorkflow.test.tsx`: session draft isolation, collection and view changes, limits, Clear, Reset, Cancel, Submit success and rejection, and shared-store default initialization

Keep MUI Data Grid gestures and dialog presentation in the manual harness unless a regression requires a focused component test. Workflow tests should exercise the session hook and store boundary rather than reproduce third-party component behavior.

## Playground example and fixtures

`apps/playground/examples/ui/App.tsx` preserves the former package-level manual integration harness. It creates one browser store and one track store, then passes that same track store to `GenomeBrowser` and `TrackSelect`. The example is intentionally not connected to an App Router route. Wire it into the playground only while inspecting dialog layout, collection navigation, MUI grid behavior, grouping, markers, or the effect of Submit on the rendered browser.

The example's Cytobands and Transcript modules use the conventional `/api/screen-graphql` endpoint. A temporary route that wires this example must also provide that server-side proxy and keep `SCREEN_API_KEY` out of browser code.

The former manual fixtures live with the example in `apps/playground/examples/ui/collections/`. Automated tests define their smaller inputs beside the test that uses them. Prefer a small fixture that isolates automated behavior; use the playground fixtures for realistic manual checks. Keep fixture entries aligned with modules registered by the example. Use `YOUR_URL_HERE` for new illustrative URLs unless an existing repository fixture URL is intentionally reused.

The schema artifacts and scripts have distinct roles:

- `trackselect schema --from <module[#export]>` writes `trackSelectCollection.schema.json` by default; `--out` can select another project-relative path.
- `apps/playground/examples/ui/schemas/trackSelectCollection.schema.json` is the schema referenced by the preserved collection fixtures.
- The package build verifies that the public command can load a TypeScript module array, write a schema, and check that the generated file is current.

Generated schemas should be checked by regenerating them only when schema or module inputs change. Review generated diffs rather than editing schema output by hand.

## Workflow expectations

A TrackSelect workflow test should make the ownership boundaries visible:

1. Create a real runtime track store with the modules needed by the fixture.
2. Open TrackSelect with stable collections and derive the initial draft from collection tracks represented in the store.
3. Change selections and assert that the store remains unchanged before Submit.
4. Assert that Cancel or dialog dismissal drops the session without a store mutation.
5. On Submit, assert active-view ordering, one atomic `setTracks` replacement, and preservation of tracks outside the collections.
6. For failures, assert that the dialog remains open, an actionable error is shown, and no partial store update occurs.

Reset coverage should target the public contract: after arbitrary draft edits, Reset restores `defaultTrackIds` in their exact cross-collection order. Initialization coverage should also assert that non-collection tracks remain first, `undefined` and `[]` remain distinct, and defaults are applied again for changed values, replacement stores, and component remounts.

## Debugging

Start failures at the boundary where they occur:

- Collection errors: call `validateJson` with the track store's registry and inspect the field path in the error. Confirm collection track types and nested config match registered modules.
- Grid or grouping errors: reduce the collection to one view and inspect `columns`, `grouping`, `leaf`, and required metadata. Built-in fields are `id`, `title`, and `type`.
- Selection errors: compare collection-qualified IDs in rows, the draft map, and store track `base.id` values.
- Ordering errors: inspect the active view and the collection's source row order before examining the diff.
- Submit errors: separate track creation failures from a `setTracks` rejection. Both must leave the store unchanged.
- Manual harness failures: inspect `.devserve/out.log` and `.devserve/err.log` when the user-run server is managed through the repository development tooling.

When fixing a workflow defect, prefer a test at the narrowest deterministic layer plus one integration assertion at the session/store boundary when the regression crossed that boundary.
