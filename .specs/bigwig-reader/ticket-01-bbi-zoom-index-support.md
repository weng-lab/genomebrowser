# Ticket 01: Add private BBI zoom-index support

**Status:** Complete
**Spec:** `./spec.md`
**Requirements:** R10, R25-R28
**Blocked by:** None

## Outcome

Private BBI code can parse every declared zoom header and traverse either an unzoomed or zoom regional index without containing BigWig resolution policy or exposing BBI details publicly. Existing BigBed behavior remains unchanged.

## Scope

Add a focused zoom-header parser/reader under `packages/reader/src/internal/bbi/`. Represent only the internal reduction level, data offset, and index offset needed by callers. Refine the regional-index entry points so a caller can load and traverse an explicitly selected index while retaining current safe offsets, range metadata, resource-boundary behavior, and bounded node read-ahead.

Add focused tests for zoom-header layout, endian handling, truncation, declared counts, 64-bit offsets, selected-index range requests, and BigBed regression behavior.

## Acceptance Criteria

- [x] All zoom headers declared by the common header can be read in file order in both byte orders.
- [x] Internal zoom metadata retains reduction level, data offset, and index offset without becoming a package-root export.
- [x] Regional-index header loading and traversal can operate against a caller-selected index location rather than assuming `unzoomedIndexOffset`.
- [x] Parsed index headers can be identified narrowly enough for a file object to cache one per selected index.
- [x] Existing unsigned-offset checks, exact-range behavior, resource-size discovery, fallback node reads, and the 1 MiB read-ahead bound still apply.
- [x] Existing BigBed reads and BBI tests retain their behavior and public surface.

## Verification

Use synthetic BBI header bytes to cover zero, one, and multiple zoom headers; both byte orders; large unsigned offsets; and truncated input. Assert exact mocked HTTP ranges for selected unzoomed and zoom indexes. Re-run existing reader BBI and BigBed tests to detect request, caching, and traversal regressions.

## Starting Points

- `packages/reader/src/internal/bbi/commonHeader.ts` owns the 64-byte common header and declared `zoomLevelCount`.
- Standard BBI zoom headers immediately follow the common header and contain a reduction level, reserved field, data offset, and index offset.
- `packages/reader/src/internal/bbi/regionalIndex.ts` currently derives the primary index from the common header.
- `packages/reader/src/internal/bbi/dataBlocks.ts` consumes the parsed index header and matching block references.
- `packages/reader/test/bbi.test.ts` contains the established synthetic BBI and exact-range seams.

## Constraints

- Keep zoom selection and BigWig record meaning out of shared BBI code.
- Do not export zoom headers, indexes, block types, offsets, or byte operations from the package root.
- Preserve `bigint` for absolute file offsets and existing browser-only implementation constraints.
- Do not broaden this into a generic indexed-file framework.

## Out of Scope

- BigWig section or summary decoding.
- Automatic or explicit public resolution selection.
- Public factory, record, and option types.
- Index-node, data-block, or regional-result caching.
