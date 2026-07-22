# Ticket 01: Fetch and Render Chromosome Ideogram

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R1–R10, R21–R23
**Blocked by:** None

## Outcome

UI v2 publicly provides a useful `Cytobands` component that fetches and renders one complete chromosome at caller-supplied dimensions, with deterministic loading and failure behavior.

## Scope

Create a focused chromosome-ideogram subsystem in UI v2 that:

- Defines a concrete, non-generic public component API.
- Requires assembly, chromosome, width, and height.
- Uses v2’s public `BrowserRegion` type for cytoband coordinates.
- Fetches cytobands with a native GraphQL request.
- Provides a default SCREEN GraphQL endpoint and an endpoint override.
- Keys request state and cached results by endpoint, assembly, and chromosome.
- Prevents stale requests from replacing current data.
- Validates and normalizes API responses.
- Renders standard cytoband stains and centromeres across the derived chromosome extent.
- Provides visible loading, error, and empty-data states with fixed valid SVG geometry; long status text may overflow.
- Supports optional cytoband color customization.
- Exports the component and supported public types from UI v2’s package root.

Add focused automated tests for the behavior delivered by this ticket.

## Acceptance Criteria

- [x] UI v2 exports `Cytobands` and its supported component-specific types from the package root.
- [x] The component requires `assembly`, `chromosome`, `width`, and `height`.
- [x] The public API is concrete and non-generic.
- [x] Cytobands are fetched internally using native fetch and GraphQL variables for the requested assembly and chromosome.
- [x] A default SCREEN GraphQL endpoint is provided.
- [x] Consumers can override the GraphQL endpoint for an application-owned proxy.
- [x] Apollo is not added as a dependency or peer dependency.
- [x] Requests are keyed by endpoint, assembly, and chromosome.
- [x] Changing width, height, colors, or other presentation-only props does not refetch cytobands.
- [x] Changing endpoint, assembly, or chromosome requests the corresponding data.
- [x] An obsolete or cancelled request cannot replace data for the current request identity.
- [x] A completed request can be reused for the same endpoint, assembly, and chromosome.
- [x] Loading, network error, GraphQL error, empty response, and malformed response states preserve the supplied SVG dimensions and valid geometry; long status text overflow is accepted.
- [x] Empty or malformed data does not produce `NaN`, infinite values, or otherwise invalid SVG geometry.
- [x] Valid cytobands are normalized into deterministic chromosome order before rendering.
- [x] Negative, positive-intensity, variable, stalk, and centromere stains render with readable defaults.
- [x] Unknown stains do not crash the component.
- [x] The chromosome extent is derived from valid cytoband response coordinates.
- [x] Bands are clipped to the chromosome rendering extent.
- [x] Cytoband colors can be customized without changing the data request identity.
- [x] The component does not require a browser store, track store, Apollo provider, or GenomeBrowser instance.

## Verification

Focused tests must demonstrate:

- Correct endpoint, GraphQL query, and variables.
- Refetch and no-refetch boundaries.
- Reuse of a completed request identity.
- Cancellation or stale-result rejection during rapid identity changes.
- Loading, transport-error, GraphQL-error, empty, and malformed responses.
- Valid geometry for each supported stain category and centromeres.
- Safe behavior for unknown stains, unsorted bands, and invalid coordinates.
- Public package-root imports and type compatibility with v2’s `BrowserRegion`.

Run the applicable UI v2 tests, type checking/build, linting, and formatting checks according to repository guidance.

## Constraints

- Use only v2 package-root exports; do not import v2 internal source paths.
- Do not introduce another domain or genomic-region abstraction.
- Keep request coordination and rendering inside a focused UI v2 subsystem with a narrow public API.
- Keep internal band primitives private.
- Do not add Apollo.
- Do not add highlights or tooltip behavior in this ticket.
- Do not memoize as a substitute for correct request and state ownership.

## Out of Scope

- Highlight rendering and interactions.
- Tooltips.
- Browser-store synchronization.
- Multiple chromosomes in one component.
- External application migrations.
- Removal of legacy cytoband implementations.

## Completion Notes

Implemented the UI v2 `Cytobands` subsystem with native GraphQL fetching, endpoint/assembly/chromosome request identity, shared completed-request caching, abort and stale-result protection, normalized cytoband data, bounded request states, SVG clipping, standard stain rendering, centromeres, unknown-stain fallback, and configurable colors. Added package-root exports and focused component tests.

Validation completed successfully: focused ideogram tests (10), full UI v2 tests (60), UI v2 build/type declarations, lint, format check, and `git diff --check`. React Doctor reported no findings in changed files; its three warnings were in pre-existing TrackSelect files.

Public package documentation is intentionally deferred to Ticket 03. Expected targets are `packages/ui-v2/docs/README.md` and a self-contained chromosome ideogram guide under `packages/ui-v2/docs/`.

Review follow-up completed:

- Renamed the component file and private types to follow `docs/style.md` camelCase rules.
- Updated tests to exercise the runtime component through the UI v2 package entry point and configured Vitest to process its MUI dependency path.
- Added rejected-fetch coverage, endpoint URL assertions, bounded completed-request cache eviction, accessible live status output outside the SVG image subtree, and exact geometry assertions.

Post-review validation completed successfully: focused ideogram tests (13), full UI v2 tests (63), UI v2 build/type declarations, lint, format check, and `git diff --check`. React Doctor reported no ideogram findings; its remaining warnings are in pre-existing TrackSelect files.

Final artifact reconciliation confirms that long loading/error text overflow is accepted for now. Statuses remain visible, and the caller-supplied SVG dimensions and geometry remain valid, so this does not block completion.
