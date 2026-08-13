# Ticket 03: Regional index and BBI blocks

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R14, R15, R18, R19, R20, R22, R23, R24, R25, R31
**Blocked by:** Ticket 02

## Outcome

The private BBI layer can lazily locate and retrieve all data blocks that may overlap a single-chromosome query, including chromosome-spanning bounds, and return format-neutral decompressed bytes.

## Scope

Parse and traverse the primary regional R-tree using lexicographic chromosome/base bounds, retrieve matching blocks sequentially, and inflate internally compressed zlib blocks with `fflate`. Define a narrow private block result that contains bytes and necessary location/query context without assuming a BigBed payload.

## Acceptance Criteria

- [ ] R-tree headers, internal nodes, and leaf entries are decoded with the file's byte order and unsigned value semantics.
- [ ] Node and leaf overlap compares ordered `(chromosome ID, base)` positions and handles bounds spanning chromosome IDs.
- [ ] Only overlapping branches and leaf blocks are fetched.
- [ ] Variable-sized nodes may use exact header and body requests while traversal remains sequential.
- [ ] Compressed blocks are inflated with `fflate`; uncompressed blocks pass through unchanged.
- [ ] Cancellation is checked around every fetch and decompression step.
- [ ] Returned block data is private and format-neutral, with no BED fields, Zod, or BigBed record assumptions.
- [ ] No state is retained between reads.

## Verification

Cover internal and leaf nodes, exact half-open boundaries, no-overlap queries, chromosome-spanning entries, absolute block offsets, compressed and uncompressed blocks, cancellation, and ordinary decompression failures. Assert sequential range behavior and absence of unrelated branch requests.

## Starting Points

- Ticket 02 header and chromosome result
- `packages/reader/test/fixtures/bigbed/basic.bb`
- `fflate` must be a regular runtime dependency.
- Use an authoritative BBI layout source; reference repositories may inform behavior but are not code sources.

## Constraints

- No parallel requests, read-ahead, range merging, request coalescing, retries, or caching.
- Keep zoom indexes and BigWig decoding out of the shared block layer.

## Out of Scope

BigBed payload decoding, exact record filtering, schemas, public factories, and documentation.
