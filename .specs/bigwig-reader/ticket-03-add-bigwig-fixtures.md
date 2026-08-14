# Ticket 03: Add deterministic BigWig fixtures

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R15, R30
**Blocked by:** None

## Outcome

The reader package has small, reproducible BigWig fixtures with known source signal, chromosome sizes, zoom data, and compressed/uncompressed block coverage suitable for deterministic regional integration tests.

## Scope

Create `packages/reader/test/fixtures/bigwig/` following the existing BigBed fixture convention. Commit source bedGraph signal, chromosome sizes, generated BigWig binaries, and exact regeneration/inspection commands. Ensure the source includes multiple chromosomes, sparse gaps, overlapping query boundaries, negative and positive values, and enough span/data for the converter to emit usable zoom levels. Include compressed and uncompressed variants when required to cover both paths.

Record trusted expected zoom levels and representative zoom summary output using UCSC tooling or another independently verifiable inspection path.

## Acceptance Criteria

- [ ] Fixture source signal and chromosome-size files are human-readable and committed.
- [ ] At least one converter-generated fixture declares zoom levels and supports deterministic unzoomed and zoom regional reads.
- [ ] Compressed and uncompressed BBI data-block behavior are both represented by committed fixtures.
- [ ] Inputs cover multiple chromosomes, sparse regions, boundary-overlapping intervals, and varied signal values.
- [ ] A fixture README records exact generation commands, tool names, relevant options, and trusted inspection commands/output needed by tests.
- [ ] Fixtures remain small enough for the routine test suite and have clear provenance.

## Verification

Regenerate or inspect the binaries using the documented commands. Confirm BigWig format, chromosome contents, unzoomed values, declared reduction levels, representative summary statistics, and compression mode before relying on them in reader integration tests.

## Starting Points

- `packages/reader/test/fixtures/bigbed/README.md` is the repository convention for generated BBI fixtures and provenance.
- `packages/reader/test/fixtures/bigbed/basic.bed` and `chrom.sizes` demonstrate source-input organization.
- Prefer official UCSC BigWig conversion and inspection tools when available.

## Constraints

- Do not invent remote track URLs; fixtures are local deterministic test assets.
- Do not rely exclusively on hand-authored binary data for end-to-end format confidence.
- Synthetic test blocks may later complement these fixtures for section encodings or byte orders the converter does not naturally produce.

## Out of Scope

- Reader implementation or package exports.
- Large production BigWigs or optional network integration tests.
- Exhaustive combinations of converter settings.
