# BAM alignments

Use `createBamFile` to read sequence alignments from a public HTTP(S) BAM file and its BAI index.
The reader fetches only the compressed blocks the index says overlap each region, so payload scales
with the window rather than the file.

## Read alignments

Create a reusable file object, then read a zero-based, half-open region:

```ts
import { createBamFile } from "@weng-lab/genomic-reader";

const file = createBamFile({ url: "YOUR_URL_HERE" });
const records = await file.read({ chromosome: "chr12", start: 120978543, end: 121002512 });
```

Each record carries its interval plus the alignment fields:

```ts
{
  chromosome: "chr12",
  start: 120978543,        // zero-based leftmost aligned base
  end: 120978643,          // start plus the reference span of the CIGAR
  name: "A00565:142:HL7TLDRXX:1:1166:28791:4445",
  flag: 163,
  mappingQuality: 60,
  strand: "+",
  cigar: [{ operation: "M", length: 100 }],
  sequence: "CGGGCTCAGTGGCTCACGCCTGTAATCCCAGCACTTTGGG..."
}
```

`end` is derived from the CIGAR operations that advance along the reference (`M`, `D`, `N`, `=`,
`X`), so a spliced read spans its introns. Records are returned sorted by `start`.

## The index

The index defaults to the BAM URL with `.bai` appended. Pass `indexUrl` when it lives elsewhere:

```ts
createBamFile({ url: "YOUR_URL_HERE", indexUrl: "YOUR_URL_HERE" });
```

Only BAI is supported. CSI indexes, and the references longer than 512 Mbp that need them, are not
yet read.

## Reference names must match

Names are matched exactly. A file whose header says `1` does not answer a query for `chr1`, and the
read returns no records rather than failing, because a missing reference is normal when panning
across assemblies. Read the header to discover what a file calls its references:

```ts
const header = await file.getHeader();
header.references; // [{ name: "chr1", length: 248956422 }, ...]
header.text; // the plain-text SAM header
```

## What is returned, and what is not

- **Overlap, not containment.** A record whose alignment begins before the region is returned when
  it reaches into it, including reads that span the region entirely through an `N` gap.
- **Unmapped records are omitted.** They carry no interval to place, even when they sort into the
  region through a mate's position.
- **Secondary, supplementary, and duplicate records are returned.** Whether those belong in a view
  is the caller's decision; test `flag` to filter them.
- **Optional tags are not decoded.** Fields such as `NM` and `MD` are skipped.

## Cost

Everything in a window is decoded, so memory scales with the number of alignments, not the width of
the region. A deeply covered gene can hold tens of thousands of records in a few kilobases. Bound
the region before reading rather than reading and discarding.

## Server requirements

The host must support HTTP range requests, and cross-origin hosts must send permissive CORS headers
including `Access-Control-Allow-Headers: range` and `Access-Control-Expose-Headers: content-range`.
Both the BAM and its index are fetched, so both must be reachable.

## Cancellation

Pass an `AbortSignal` to cancel in-flight reads:

```ts
const controller = new AbortController();
const records = await file.read(region, { signal: controller.signal });
```

The header and index are cached on the file object after the first successful read, so later reads
of other regions fetch only alignment blocks.

## Public types and methods

Import all APIs here from `@weng-lab/genomic-reader`.

```ts
type BamFileOptions = { url: string; indexUrl?: string };
type BamCigarOperation = "M" | "I" | "D" | "N" | "S" | "H" | "P" | "=" | "X";
type BamCigarSegment = { operation: BamCigarOperation; length: number };
type BamRecord = GenomicRecord & {
  name: string;
  flag: number;
  mappingQuality: number;
  strand: "+" | "-";
  cigar: BamCigarSegment[];
  sequence: string;
};
type BamReference = { name: string; length: number };
type BamHeader = { text: string; references: BamReference[] };
interface BamFile extends GenomicFile<BamRecord> {
  read(region: GenomicRegion, options?: ReadOptions): Promise<BamRecord[]>;
  getHeader(options?: ReadOptions): Promise<BamHeader>;
}

function createBamFile(options: BamFileOptions): BamFile;
```

### createBamFile and BamFileOptions

`url` is required and must be an absolute HTTP(S) URL. `indexUrl` defaults to `url` with `.bai`
appended. Invalid options or URLs throw synchronously; file contents are validated lazily by
`read()`.

### BamFile and BamRecord

`read()` returns the alignments overlapping the region, sorted by `start`. `end` is derived from the
CIGAR operations that advance along the reference, so a spliced record spans its introns. A region
naming a reference the file does not contain returns an empty array rather than rejecting, because
panning onto an unknown contig is ordinary. Coordinates must be finite nonnegative integers with
`start < end`; invalid regions reject asynchronously.

Header and index metadata are cached on the file object after the first successful read. HTTP,
decoding, and abort failures reject rather than returning partial results.

### The header

`getHeader()` returns the plain-text SAM header and the reference list in file order. Read it to
discover what a file calls its references before querying, since names are matched exactly.

### CIGAR

`cigar` preserves the operations in file order. `M`, `D`, `N`, `=`, and `X` advance along the
reference; `I`, `S`, `H`, and `P` do not.

## Related reference

[Shared regional contract](../regionalReading/genomicFile.md) · [BAM alignments index](README.md) ·
[All reader APIs](../README.md)
