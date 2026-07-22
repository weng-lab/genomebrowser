# Chromosome Ideogram

**Status:** Ready

## Problem

The existing cytoband implementations have diverged. One couples fixed-size rendering to Apollo fetching and browser-domain state, while another provides richer highlighting and interaction behavior but carries inconsistent types, narrow-highlight interaction bugs, and legacy API decisions.

UI v2 needs one cohesive chromosome ideogram component that fetches its own cytoband data and supports the simple browser-region use case as well as interactive locus displays.

## Desired Outcome

UI v2 publicly exports a self-contained `Cytobands` component. A consumer supplies an assembly, chromosome, dimensions, optional v2 highlights, and an optional current v2 browser region. The component fetches and renders the chromosome’s cytobands, provides pointer-hover highlight tooltips, reports highlight interactions consistently, and displays the current region separately from application highlights.

## Current State

The core cytoband component:

- Fetches cytobands internally through Apollo.
- Accepts an assembly and current browser domain.
- Hardcodes its width, height, colors, and current-domain highlight.
- Does not implement the richer API described by its colocated legacy types.

The `umms-gb` cytoband component used by PsychSCREEN:

- Accepts cytoband data, dimensions, colors, and one or more highlights.
- Supports highlight callbacks, children, transforms, and opacity.
- Does not fetch its own data.
- Does not attach interactions to narrow marker-style highlights.
- Uses types and required properties that do not consistently match runtime behavior.

V2 already publicly exports `Highlight` and `BrowserRegion`. UI v2 depends on v2 and should reuse those contracts rather than introducing another genomic interval or highlight model.

## Requirements

- **R1:** UI v2 must publicly export a component named `Cytobands`.

- **R2:** `Cytobands` must require:
  - `assembly: string`
  - `chromosome: string`
  - `width: number`
  - `height: number`

- **R3:** The component must fetch all cytobands for the requested assembly and chromosome internally. Consumers must not be required to fetch or pass cytoband data.

- **R4:** Cytoband requests must use native fetch rather than requiring Apollo. The API must support an optional GraphQL endpoint override so applications can use their own authenticated proxy. A documented SCREEN GraphQL endpoint must be used as the default.

- **R5:** Fetching must be keyed by endpoint, assembly, and chromosome. Changes to dimensions, highlights, or tooltip content must not refetch cytoband data.

- **R6:** Stale requests must not replace data for a newer assembly or chromosome. In-flight requests should be cancelled when practical, and previously fetched chromosome data should be reusable for the same request identity.

- **R7:** The component must provide visible loading and error states while preserving the caller-supplied SVG dimensions and valid SVG geometry. Long status text may overflow the assigned width. Empty or malformed cytoband responses must not produce invalid SVG geometry.

- **R8:** Cytoband response coordinates must use v2’s `BrowserRegion` type where applicable. The UI package may introduce cytoband-specific types for stain and response data but must not introduce a duplicate domain type.

- **R9:** The component must render standard cytoband stains, including negative, positive-intensity, variable, stalk, and centromere bands. Unknown stains must not crash the component.

- **R10:** The chromosome rendering extent must be derived from the complete cytoband response. Bands and overlays must be clipped to the rendered chromosome extent.

- **R11:** The component must accept `highlights?: readonly Highlight[]` using the `Highlight` type publicly exported by v2.

- **R12:** A highlight whose region omits `chromosome` must be interpreted as belonging to the displayed chromosome. A highlight with a different explicit chromosome must not be rendered.

- **R13:** Highlights must use their stable `id` for rendering identity. Invalid, empty, or entirely out-of-range highlight intervals must not produce invalid SVG geometry.

- **R14:** Wide highlights must render as interval overlays. Highlights narrower than the minimum useful pointer target must render with a visible marker treatment.

- **R15:** Wide and narrow highlights must provide identical pointer-hover tooltip, pointer, focusability, keyboard activation, and click behavior. Visual SVG tooltips are pointer-hover-only: focus must neither open nor retain one, and pointer leave or click must close one.

- **R16:** Every rendered highlight must provide a tooltip on pointer hover. Without customization, the tooltip must display the chromosome and formatted start/end coordinates.

- **R17:** Consumers must be able to provide `renderHighlightTooltip?: (highlight: Highlight) => React.ReactNode` to replace the default tooltip content.

- **R18:** Custom tooltip content must mount only for the currently pointer-hovered highlight. The component must not invoke or mount tooltip content for every inactive highlight, allowing tooltip components to perform their own data access efficiently.

- **R19:** The component must support:
  - `onHighlightClick`
  - `onHighlightPointerEnter`
  - `onHighlightPointerLeave`

  Each callback must receive the corresponding v2 `Highlight` and the relevant React event.

- **R20:** Highlights with click behavior must retain an accessible name, focusability, and Enter/Space activation. Focus must not open or retain a visual tooltip. Keyboard activation must invoke the same semantic click behavior as pointer activation.

- **R21:** The component must support optional cytoband color customization. Highlight color is required and opacity is optional through the existing v2 `Highlight` fields; omitted highlight opacity must render as `0.2`, while explicit `0`, fractional values, and `1` must be preserved. Defaults must produce a complete, readable ideogram without additional styling.

- **R22:** The component must not depend on a browser store, track store, Apollo provider, or GenomeBrowser instance. The caller supplies browser regions and application loci through their separate public props.

- **R23:** The public API must remain concrete and non-generic. Applications that need additional tooltip data should use the highlight ID or coordinates to access that data from the tooltip component or surrounding application state.

- **R24:** Automated coverage must demonstrate both established use cases:
  - A chromosome ideogram with a current-region bracket supplied from a v2 browser region.
  - A chromosome ideogram with multiple interactive locus highlights and custom tooltip content.

- **R25:** The component must accept `currentRegion?: BrowserRegion` using the type publicly exported by v2. A valid region for the displayed chromosome must render after application highlights as a separate, non-interactive, unfilled blue bracket with full ideogram-height boundaries and short inward caps. Tiny regions must receive a visible minimum bracket width centered on their true position. Partially overlapping regions must be safely clipped, while invalid, entirely outside, or mismatched-chromosome regions must not render. The bracket must use `pointer-events: none`, have a useful accessible label, and have no tooltip or highlight-callback behavior.

## Technical Decisions

- `Cytobands` represents one complete chromosome, not the currently visible browser domain.
- Assembly and chromosome are explicit required inputs and are passed directly to the cytoband query.
- Browser viewport regions are passed directly as v2 `BrowserRegion` values through `currentRegion` and rendered as a distinct bracket; they are not application highlights.
- Cytoband fetching is internal but transport configuration remains overridable so consuming applications can use their existing API proxies and authentication boundaries.
- Apollo is not added as a UI v2 dependency or peer dependency.
- V2’s existing `Highlight` and `BrowserRegion` contracts are the shared genomic types.
- Tooltip customization is a render callback receiving only the shared `Highlight`. The component does not carry arbitrary application metadata or use a generic highlight type.
- Tooltip and interaction ownership remains inside the ideogram subsystem, while custom tooltip content owns any application-specific data fetching.
- Internal band-rendering primitives are implementation details; the supported public surface is the complete ideogram component and its component-specific types.

## Verification Strategy

Automated component tests should verify:

- The expected query variables and endpoint are used.
- Cytobands refetch when assembly, chromosome, or endpoint changes.
- Cytobands do not refetch for dimension, highlight, or tooltip changes.
- Stale responses cannot replace current chromosome data.
- Loading, network error, GraphQL error, empty response, and malformed response behavior.
- Standard stains and centromeres produce valid SVG geometry.
- Unknown stains and invalid highlights do not crash rendering.
- Highlights are filtered by chromosome and clipped to chromosome bounds.
- Wide and narrow highlights expose the same tooltip and callback behavior.
- Highlight tooltips open only on pointer hover and close on pointer leave or click; focus does not open or retain them.
- Default tooltip coordinate content.
- Custom tooltip content mounts only for the pointer-hovered highlight.
- Pointer and keyboard activation invoke `onHighlightClick` with the correct highlight.
- A browser store's complete `BrowserRegion` can be passed directly as `currentRegion` without an adapter.
- Current-region wide, minimum-width, clipped, filtered, and non-interactive bracket behavior.

A manual integration example should demonstrate a browser-store current-region bracket and multiple clickable loci with asynchronously populated tooltip content.

## Out of Scope

- Rendering multiple chromosomes in one component.
- Owning or synchronizing a v2 browser store.
- Owning or automatically subscribing to a browser’s current region.
- Fetching application-specific tooltip data.
- General-purpose genomic annotation rendering.
- Apollo integration.
- Preserving the legacy cytoband APIs unchanged.
- Migrating external applications as part of the component implementation.

## Risks and Edge Cases

- Direct SCREEN API access may require authentication in some environments. Consumers must be able to select an application-owned proxy without changing component behavior.
- Cytoband APIs may return incomplete, unsorted, or unknown stain data. Rendering must remain deterministic and avoid invalid scaling.
- Very small highlights need a larger visual target without changing their genomic meaning.
- Overlapping highlights may compete for pointer interaction. Rendering order and active-highlight behavior must be deterministic.
- Tooltip content may fetch asynchronously and must not remain associated with a highlight after the pointer moves elsewhere.
