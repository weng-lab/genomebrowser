# Ticket 02: Decode BigWig values and summaries

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R11-R18, R27-R28
**Blocked by:** None

## Outcome

Format-specific private decoders convert every standard unzoomed BigWig section encoding and zoom summary record into the settled discriminated public record shapes while preserving coordinates, values, statistics, ordering, and overlap behavior.

## Scope

Add endian-aware 32-bit floating-point support to the existing binary reader. Add focused BigWig decoder modules for bedGraph-style, variable-step, and fixed-step unzoomed sections and for zoom summary blocks. Decode and filter records for one resolved query chromosome and half-open query region, then provide stable genomic sorting suitable for the public reader.

## Acceptance Criteria

- [ ] `BinaryReader` can decode little-endian and big-endian 32-bit floating-point values and rejects truncated reads consistently with its existing operations.
- [ ] BedGraph-style sections preserve each encoded start, end, and value.
- [ ] Variable-step sections derive each end from the section item span and preserve each encoded start and value.
- [ ] Fixed-step sections derive starts from the section start and item step, derive ends from item span, and preserve each value.
- [ ] Section chromosome, bounds, type, item count, step, and span fields are interpreted with the file's byte order and unsigned semantics.
- [ ] Zoom records preserve encoded `validCount`, `min`, `max`, `sum`, and `sumSquares`, and expose `mean` as `sum / validCount`.
- [ ] Unzoomed records use `kind: "value"`; zoom records use `kind: "summary"`; neither decoder fabricates the other shape.
- [ ] Decoders skip neighboring chromosome IDs and non-overlapping records, retain overlapping source coordinates without clipping, preserve duplicates, and support stable final sorting.
- [ ] Every emitted record uses the exact queried chromosome name associated with the resolved chromosome ID; decoders do not reverse-map IDs or apply aliases.
- [ ] Structural truncation, unsupported section types, and ordinary decode failures reject rather than yielding partial or normalized data.

## Verification

Construct focused blocks for all three section types and zoom summaries. Cover both byte orders, multiple sections/records, exact half-open boundaries, generated coordinate math, neighboring chromosome IDs, duplicate/equal-key records, unusual finite float values, and truncated or unsupported input. Assert every stored summary field and the derived mean independently.

## Starting Points

- `packages/reader/src/internal/binaryReader.ts` owns endian-aware bounds-safe primitive reads.
- `packages/reader/src/internal/bigBedDecoder.ts` demonstrates private decode/filter/sort organization without sharing BigBed record semantics.
- `packages/reader/test/bigBedDecoder.test.ts` demonstrates focused decoder-test conventions.
- Keep section-format constants and decoder-only types with the decoder that owns them.

## Constraints

- Preserve encoded floating-point values as JavaScript numbers without rounding, clamping, filtering, or scientific normalization.
- Do not alias a summary mean to `value`.
- Do not synthesize zero-valued gaps or clip source coordinates to the query.
- Treat files as trusted while retaining binary bounds checks and safe numeric operations.

## Out of Scope

- Fetching blocks, traversing indexes, selecting zoom levels, or caching metadata.
- Core renderer adaptation or pixel aggregation.
- Total-file summary metadata or scientific interpretation of values.
