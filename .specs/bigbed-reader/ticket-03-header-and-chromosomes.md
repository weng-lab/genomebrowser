# Ticket 03: BigBed header and chromosomes

**Status:** Ready
**Spec:** `./spec.md`
**Requirements:** R10, R11, R12, R13, R17, R18
**Blocked by:** Ticket 01, Ticket 02

## Outcome

One read operation can validate a BigBed file and resolve an exact chromosome name through its indexed chromosome tree, including trees located outside the initial header bytes.

## Scope

Parse the common BigBed header, detect byte order from the magic value, retain only metadata required for regional data access, and traverse the chromosome B+ tree from its declared file offset. Return file-local chromosome ID and size for a requested name without assuming the complete tree is contiguous with the header.

## Acceptance Criteria

- [ ] Header parsing recognizes valid little- and big-endian BigBed magic values and rejects BigWig or unknown formats.
- [ ] Header fields required for chromosome lookup, data-index traversal, and block decompression are parsed with bounds and safe-offset validation.
- [ ] Chromosome-tree headers, internal nodes, leaf nodes, key sizes, counts, and child offsets are validated before use.
- [ ] Tree nodes are read from declared absolute offsets; lookup works when the tree is beyond the initially read header range.
- [ ] Chromosome matching is exact and case-sensitive.
- [ ] An absent chromosome is represented as a normal miss so public orchestration can return `[]` without reading the regional data index.
- [ ] Header and tree state is scoped to one read operation and is not retained between reads.

## Verification

Use in-memory binary fixtures for both endian orders, leaf and multi-level trees, long tree offsets, unknown chromosomes, malformed magic values, invalid node types/counts, unsafe offsets, and truncated keys or nodes. Verify the sequence of exact byte reads rather than depending on a fixed metadata prefetch size.

## Starting Points

- Header layout reference: `/home/jair/Dev/bigwig-reader/src/bigwig/BigWigHeaderReader.ts`.
- Chromosome-tree reference: `/home/jair/Dev/gb-api/track/bigdata/chromtree.go`.
- Existing regression evidence: `patches/genomic-reader@1.4.10.patch` fixes the old assumption that the chromosome tree is contained in the initial metadata response. Do not copy its fixed 1 MiB fallback.

## Constraints

- Carry the detected byte order through every subsequent parser; never rely on a default endian setting.
- Do not parse or expose AutoSQL or zoom metadata beyond safely reading/skipping fields needed to locate regional data.

## Out of Scope

- Data R-tree traversal, blocks, records, public factories, metadata caching, and whole-tree preloading.
