# Ticket 04: Regional index traversal

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R4, R9, R11, R12, R17, R18
**Blocked by:** Ticket 01, Ticket 02, Ticket 03

## Outcome

The reader can traverse a BigBed R-tree for one resolved genomic region and produce a deduplicated set of exact data-block ranges that may contain overlapping records.

## Scope

Parse and validate the primary data-index header, read internal and leaf nodes from their declared offsets, prune nodes that cannot overlap the single-chromosome query, and deduplicate leaf data ranges within the operation.

## Acceptance Criteria

- [ ] The R-tree header magic, sizes, counts, and root location are validated using the file's byte order.
- [ ] Internal and leaf node layouts are parsed with exact reads and bounds checks rather than fixed-size speculative prefetches.
- [ ] Traversal follows only child bounds that can overlap the query chromosome ID and bases.
- [ ] Leaf output contains safe `(offset, length)` data ranges and rejects invalid or overflowing values.
- [ ] Repeated references to the same data range are returned once per read operation.
- [ ] Empty index results are handled normally.
- [ ] Malformed node types, impossible item counts, recursive offsets, and truncated nodes fail instead of returning partial block lists.

## Verification

Build focused in-memory R-tree fixtures covering leaf roots, multiple internal levels, chromosome boundaries, regions touching but not overlapping bounds, no matches, duplicate leaves, malformed counts, unsafe offsets, and truncation. Index pruning may be conservative, but tests must ensure it never excludes a potentially overlapping record.

## Starting Points

- JavaScript reference: `loadLeafNodesForRPNode` and R-tree constants in `/home/jair/Dev/bigwig-reader/src/bigwig/BigWigReader.ts`.
- Clearer layout reference: `/home/jair/Dev/gb-api/track/bigdata/tree.go` and `/home/jair/Dev/gb-api/track/bigdata/rtree.go`.
- Both reference implementations lack the per-read leaf deduplication required here.

## Constraints

- Final half-open record filtering belongs to record decoding; index traversal may use conservative container bounds.
- Keep traversal sequential unless bounded concurrency is proven necessary for correctness.

## Out of Scope

- Data-block decompression, record parsing, caching, and zoom indexes.
