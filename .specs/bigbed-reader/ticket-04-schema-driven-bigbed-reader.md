# Ticket 04: Schema-driven BigBed reader

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R11a, R12, R13, R15, R21, R26, R27, R28
**Blocked by:** Ticket 03

## Outcome

Consumers can create a typed BigBed file with `createBigBedFile({ url, schema })` and read correctly filtered, schema-parsed, stably sorted records whose type is inferred from the required Zod schema.

## Scope

Add `bed3Schema`, the generic factory types, BigBed block decoding, chromosome-ID filtering, exact coordinate filtering, immediate schema parsing, stable sorting, and package-root exports. Wire region validation and query-scoped cancellation into the complete stateless read path.

## Acceptance Criteria

- [ ] `createBigBedFile` is synchronous, performs no fetch, and returns a structurally conforming `GenomicFile` inferred from the schema output.
- [ ] `bed3Schema` outputs `{ chromosome, start, end, fields }` and accepts any number of fields after BED3.
- [ ] Record decoding treats an empty trailing payload as `[]` and preserves all non-empty tab-separated fields, including empty entries, in source order.
- [ ] Records whose chromosome ID differs from the query are skipped before exact coordinate overlap filtering.
- [ ] Original coordinates and schema output are returned without clipping, normalization, semantic BED validation, or deduplication.
- [ ] Schema failures reject with their Zod error and never produce partial success.
- [ ] Results are stably sorted by chromosome, start, and end; equal-key records retain source decode order.
- [ ] Unknown chromosomes and valid no-data regions return `[]`; invalid regions and all other failures reject according to the spec.
- [ ] Public exports add only the intended BigBed factory and schema surface, not BBI internals.
- [ ] Zod 4 is declared as a peer and development dependency.

## Verification

Use the committed BED6 fixture with `bed3Schema` to verify inferred types, retained fields, boundaries, overlaps, sorting, both chromosomes, unknown chromosomes, and no-data reads. Add focused decoder tests for BED3 empty fields, embedded empty trailing fields, duplicate order, cross-chromosome blocks, schema transforms, too-few-field schema failures, malformed records, and cancellation.

## Starting Points

- `packages/reader/src/genomicFile.ts`
- `packages/reader/src/lib.ts`
- Ticket 03 format-neutral blocks
- `packages/reader/test/fixtures/bigbed/basic.bed`

## Constraints

- Do not export a `BigBedRecord`, BBI type, reader class, byte source, or generic format factory.
- Do not parse AutoSQL or add built-in schemas beyond `bed3Schema`.
- Keep schemas shallow and shape-oriented; no BED domain validation.

## Out of Scope

BigWig, BigGenePred helpers, BED4-BED12 schemas, extra-index lookup, caching, and core track migration.
