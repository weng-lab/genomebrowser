# Ticket 02: Add Interactive Highlights and Tooltips

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R11–R23
**Blocked by:** T01

## Outcome

`Cytobands` accepts v2 highlights and gives wide and narrow loci consistent, accessible tooltip and interaction behavior.

## Scope

Extend the rendered chromosome ideogram to:

- Accept `readonly Highlight[]` using v2’s public `Highlight` type.
- Filter highlights according to the displayed chromosome.
- Validate and clip highlight intervals to the chromosome extent.
- Render wide intervals as overlays and narrow intervals as visible markers.
- Track one pointer-hovered highlight for visual tooltip ownership.
- Provide a pointer-hover-only default coordinate tooltip that closes on pointer leave or click and is not opened or retained by focus.
- Support custom tooltip content through `renderHighlightTooltip`.
- Mount custom tooltip content only for the pointer-hovered highlight.
- Report pointer enter, pointer leave, and click interactions.
- Make clickable highlights focusable and keyboard-activatable.
- Apply highlight colors and opacity from the shared v2 type.
- Define deterministic ordering for overlapping highlights.

Add focused automated tests for all highlight shapes and interaction paths.

## Acceptance Criteria

- [x] `Cytobands` accepts `highlights?: readonly Highlight[]` using the type exported by v2.
- [x] No duplicate or generic highlight type is introduced.
- [x] Highlights without an explicit chromosome are interpreted as belonging to the displayed chromosome.
- [x] Highlights with a different explicit chromosome are not rendered.
- [x] Highlight rendering identity uses `Highlight.id`.
- [x] Empty, reversed, malformed, and entirely out-of-range intervals do not produce invalid geometry.
- [x] Partially overlapping intervals are clipped to the chromosome extent.
- [x] Wide highlights render as interval overlays.
- [x] Highlights too narrow to provide a useful pointer target render with a visible marker treatment.
- [x] Narrow markers retain their true genomic position while providing a usable interaction target.
- [x] Wide and narrow highlights provide equivalent pointer-hover tooltip, focusability, and activation behavior.
- [x] Every rendered highlight has a pointer-hover tooltip containing its chromosome and formatted start/end coordinates.
- [x] `renderHighlightTooltip` can replace the default content.
- [x] Custom tooltip content is invoked and mounted only for the pointer-hovered highlight.
- [x] Tooltip content is removed or replaced when the pointer-hovered highlight changes.
- [x] `onHighlightPointerEnter` receives the relevant highlight and React pointer event.
- [x] `onHighlightPointerLeave` receives the relevant highlight and React pointer event.
- [x] `onHighlightClick` receives the relevant highlight and React activation event.
- [x] A highlight with click behavior is focusable.
- [x] Focusing a highlight does not open or retain a visual tooltip.
- [x] Enter and Space activation invoke the same semantic click behavior as pointer activation.
- [x] Required highlight color and optional opacity come from the v2 `Highlight` value; omitted opacity renders as `0.2`, and explicit `0`, fractional values, and `1` are preserved.
- [x] Overlapping highlights have deterministic visual and interaction ordering.
- [x] Passing different highlights or tooltip content does not refetch cytoband data.
- [x] The component remains independent of browser and track stores.

## Verification

Focused component tests must cover:

- Direct use of v2 `Highlight` values.
- Inherited, matching, and mismatched chromosome behavior.
- Fully visible, partially clipped, invalid, and out-of-range intervals.
- Wide and narrow highlight geometry.
- Overlapping-highlight ordering.
- Pointer enter, leave, and click callbacks.
- Focus-does-not-open, blur, Enter, and Space behavior.
- Default tooltip coordinates.
- Custom tooltip rendering and pointer-hover-only mount lifecycle.
- Tooltip replacement during rapid movement between highlights.
- Highlight color, missing-opacity default, and explicit `0`, fractional, and `1` opacity.
- No additional cytoband request after highlight, callback, or tooltip changes.

Run the applicable UI v2 tests, type checking/build, linting, formatting checks, and React diagnostics according to repository guidance.

## Constraints

- Keep the public API concrete and non-generic.
- The custom tooltip callback receives only the shared v2 `Highlight`.
- Do not add arbitrary application metadata to the highlight contract.
- Application-specific tooltip data fetching belongs to the custom tooltip component.
- Wide and narrow highlights must share one semantic interaction path rather than maintaining divergent behavior.
- Keep active-highlight state local to the smallest owning component.
- Do not add browser-store synchronization.

## Out of Scope

- Fetching application-specific tooltip data.
- Automatically turning the active browser region into a highlight.
- Persisting active tooltip state.
- External application migrations.
- Multiple-chromosome rendering.

## Completion Notes

Added concrete v2 `Highlight` support with chromosome inheritance/filtering, interval validation and clipping, deterministic overlap order, wide overlays, narrow marker visuals, and minimum-width hit targets. Wide and narrow highlights share pointer-hover tooltip, focusability, click, Enter, and Space behavior; focus does not open or retain visual tooltips.

Added pointer-hover-only default and custom tooltips. Pointer leave and click close the tooltip, while focus does not open or retain it. Interaction state is isolated behind a key derived from the rendered highlight ID set so removal, filtering, or chromosome changes cannot resurrect stale tooltip state.

The UI v2 manual harness now supplies two stable, independently clickable chr6 highlights. Its click handler selects `setRegion` directly from the existing browser store and sends a complete `BrowserRegion`, using the displayed chromosome when a highlight omits one. No mirrored state, synchronization Effect, store recreation, or reflexive callback memoization was introduced.

Validation completed successfully: focused ideogram tests (30), full UI v2 tests (80), UI v2 build/type declarations, lint, format check, and `git diff --check`. React Doctor reported no ideogram findings; remaining warnings are pre-existing TrackSelect diagnostics.

Final artifact reconciliation records the settled pointer-hover-only visual tooltip behavior in the spec, scope, acceptance criteria, verification, and completion wording. Focusability, accessible names, and Enter/Space activation remain intact, so this no longer blocks completion.
