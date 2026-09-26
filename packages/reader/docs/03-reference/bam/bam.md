# BAM reader

Read alignments from a coordinate-sorted, BGZF-compressed BAM file with its matching BAI index. Import all APIs from `@weng-lab/genomic-reader`.

## Usage

```ts
import { createBamFile } from "@weng-lab/genomic-reader";

const file = createBamFile({
  url: "YOUR_URL_HERE",
  indexUrl: "YOUR_URL_HERE",
});
const records = await file.read({
  chromosome: "21",
  start: 33_019_935,
  end: 33_021_000,
});
```

Supply separate BAM and BAI URLs. Exact sequence names take priority. If an exact name is absent, the reader tries adding or removing the case-sensitive `chr` prefix. Thus `chr20` can read a BAM reference named `20`, and vice versa. Returned alignments and mates on the queried reference use the requested spelling; mates on other references retain their BAM names. This does not convert genome assemblies or coordinates, and does not map `chrM` to `MT`. The region above corresponds to the UCSC BAM example, whose reference is named `21`, without a `chr` prefix.

## createBamFile and BamFileOptions

```ts
type BamFileOptions = { url: string; indexUrl: string };
function createBamFile(options: BamFileOptions): BamFile;
```

Both URLs are required HTTP(S) URLs and are validated synchronously. Creating the file performs no network access. BAM requests require HTTP 206 byte-range responses without a `Content-Encoding` header. BGZF is the file's compression format; HTTP decompression would invalidate its indexed byte offsets. The index is fetched in full with an HTTP 200 response. Both resources must allow browser access through CORS.

Reuse the file object to retain the parsed reference dictionary and BAI index. Alignment records and compressed data are not retained between reads. Cancellation and failed requests do not prevent retrying.

## BamFile

```ts
interface BamFile extends GenomicFile<BamRecord> {
  getHeader(options?: ReadOptions): Promise<BamHeader>;
}
```

`read(region, options?)` follows the [regional file contract](../regionalReading/genomicFile.md). It returns mapped alignments overlapping the zero-based, half-open region, sorted by start and then end. Records retain their full coordinates and sequences. Overlap uses the reference span from CIGAR, including deletions and skipped regions. A mapped record consuming no reference bases occupies one base for overlap.

Missing sequence names, regions beyond a sequence's length, and regions without alignments return an empty array. Unmapped records are omitted; secondary, supplementary, duplicate, and quality-failed alignments remain available through their flags.

Coordinates must be nonnegative integers with start before end. BAI queries must end at or before `2 ** 29`. Validation, HTTP failures, invalid/truncated binary data, and cancellation reject the read without returning partial records. Each call accepts its own optional `AbortSignal`; aborting one call does not cancel concurrent calls.

A read requests the BAM byte ranges its index chunks point to. Chunks less than 32 KiB apart share one request, and up to eight requests run at once. Aborting the read, or any request failing, cancels the requests still running.

## BamHeader and BamReference

`getHeader({ signal }?)` returns `{ text: string, references: BamReference[] }`. `text` is the SAM header text; each reference contains `name: string` and `length: number`, in file order. Names retain their original spelling, even after reads using the `chr` fallback.

```ts
const controller = new AbortController();
const header = await file.getHeader({ signal: controller.signal });
console.log(header.text, header.references);
```

The header is validated and cached after a successful load, shared with `read()`. Header access does not fetch the BAI. Each call returns a defensive copy of the reference list. Pre-aborted and in-flight calls reject, including requests served from the cache. Aborting one caller does not cancel other callers or prevent retrying. Malformed headers reject without caching partial results.

## BamRecord

| Field            | Type                  | Meaning                                                              |
| ---------------- | --------------------- | -------------------------------------------------------------------- |
| `chromosome`     | `string`              | Requested reference name, after optional prefix matching.            |
| `start`, `end`   | `number`              | Full zero-based, half-open reference span.                           |
| `readName`       | `string`              | BAM query name.                                                      |
| `flags`          | `number`              | Raw SAM bit flags.                                                   |
| `strand`         | `"+"` or `"-"`        | Alignment orientation from flag 0x10.                                |
| `mappingQuality` | `number`              | Raw MAPQ; 255 means unavailable.                                     |
| `cigar`          | `BamCigarOperation[]` | Operations in stored order; empty when unavailable.                  |
| `sequence`       | `string`              | Stored BAM sequence, including IUPAC bases; empty if absent.         |
| `phredQualities` | `number[]` or `null`  | Per-base Phred scores, or null when unavailable/absent.              |
| `mate`           | `BamMate` or `null`   | Mate reference information, or null when the reference ID is absent. |
| `templateLength` | `number`              | Signed template length.                                              |

Reverse-strand sequences are returned as stored in BAM, without another reverse complement. Auxiliary tags are not exposed.

## BamCigarOperation

Each operation contains `op` (`M`, `I`, `D`, `N`, `S`, `H`, `P`, `=`, or `X`), its positive `length`, and zero-based `sequenceOffset` and `referenceOffset` before the operation. Reference offsets are relative to the record's `start`; sequence offsets index its stored sequence.

## BamMate

`BamMate` contains `chromosome: string`, `start: number`, `strand: "+" | "-"`, and `unmapped: boolean`. The chromosome is resolved using the mate's reference ID, which can differ from the alignment's reference. Start is zero-based or -1 if unavailable. Orientation and unmapped status come from flags 0x20 and 0x8.

## Hosting the UCSC example

The test fixtures use the unmodified [UCSC BAM example](https://genome.ucsc.edu/goldenPath/help/examples/bamExample.bam) and its [BAI index](https://genome.ucsc.edu/goldenPath/help/examples/bamExample.bam.bai). The tests serve these bytes through a mocked range endpoint.

A live check on 2026-09-23 found that UCSC serves BAM ranges with `Content-Encoding: x-gzip`. The range reader rejects that response. To use these example files with this API, host copies on a server that serves the original bytes with HTTP 206, CORS, and no transport content encoding.

## Supported files

This reader supports BAI indexing, not CSI, CRAM, or unindexed BAM. BAM and BAI must describe the same coordinate-sorted file; matching reference counts alone cannot verify that an index is current. Alignments with more than 65,535 CIGAR operations store a placeholder (`l_seq S` followed by a reference-span `N`) and keep the real CIGAR in the `CG:B:I` auxiliary tag. The reader returns the `CG` operations in place of the placeholder. If that tag is missing or does not match the placeholder, the record keeps its reference span with an empty `cigar`. General auxiliary tag decoding and coverage aggregation are not part of this API.

[BAM index](README.md) · [All reader APIs](../README.md)
