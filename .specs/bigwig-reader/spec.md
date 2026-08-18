# BigWig reader

**Status:** Ready

## Problem

`@weng-lab/genomic-reader` can read BigBed files through private BBI infrastructure, but it cannot yet read BigWig signal data. Applications need regional access to both the original signal intervals stored in a BigWig and the summary records stored in its zoom levels without exposing byte ranges, file offsets, trees, or compression details.

Wide genomic views also need a principled way to avoid fetching unnecessarily fine data. The API must support automatic zoom selection from display resolution and reproducible selection of an exact file reduction level. Because BigWig summaries contain scientifically meaningful statistics, the reader must expose every stored summary statistic rather than collapse summaries to a single value.

## Desired Outcome

Callers synchronously create a reusable BigWig file object, inspect its available zoom reduction levels, and read either unzoomed values or zoom summaries:

```ts
const file = createBigWigFile({ url: "YOUR_URL_HERE" });

const rawRecords = await file.read(region);
const zoomLevels = await file.getZoomLevels({ signal });

const displayRecords = await file.read(region, {
  signal,
  resolution: {
    mode: "auto",
    basesPerPixel: (region.end - region.start) / 1_000,
  },
});

const reproducibleSummaryRecords = await file.read(region, {
  resolution: { mode: "level", reductionLevel: zoomLevels.at(-1)! },
});
```

Unzoomed reads return source value records. Zoom reads return source summary records containing `validCount`, `min`, `max`, `sum`, and `sumSquares`, plus an explicitly derived `mean`. BigWig reuses and extends the existing private BBI implementation while keeping BBI structures out of the public API.

## Current State

- `.specs/genomic-reader-foundation/spec.md` defines the authoritative structural `GenomicFile<T>` contract, zero-based half-open regions, sparse overlap behavior, cancellation, sorting, and format-specific read options.
- `.specs/bigbed-reader/spec.md` established private BBI modules for exact HTTP ranges, endian-aware binary parsing, the common header, lazy chromosome lookup, primary R-tree traversal, block retrieval, zlib decompression, successful instance-local metadata caching, and bounded node read-ahead.
- The common BBI header parser already recognizes BigWig magic and exposes the declared zoom-level count, but zoom headers and zoom summary blocks are not parsed.
- The shared BBI regional-index and data-block layers are currently oriented around the unzoomed index selected from the common header. They must be sharpened to support a caller-selected BBI index without moving format-specific selection into the shared layer.
- `BinaryReader` does not currently expose the endian-aware 32-bit floating-point operation needed by BigWig data and summary records.
- Core's existing BigWig, CAVE, and MethylC tracks still use the external `genomic-reader@1.4.10`. Their fetch context contains a region but no viewport width or bases-per-pixel value. Migration and resolution-aware track fetching are separate work.

## Requirements

- **R1:** The package root must export a synchronous `createBigWigFile(options)` factory. The factory must perform no network request and must synchronously reject a non-object options value, an invalid URL, or a URL scheme other than HTTP(S).
- **R2:** The package root must export the public types `BigWigFileOptions`, `BigWigFile`, `BigWigReadOptions`, `BigWigResolution`, `BigWigRecord`, `BigWigValueRecord`, and `BigWigSummaryRecord`.
- **R3:** `BigWigFileOptions` must have the shape `{ url: string }`. Stable file configuration belongs to factory options; resolution remains query-specific.
- **R4:** `BigWigFile` must remain structurally compatible with `GenomicFile<BigWigRecord>`, specialize `read(region, options?)` with `BigWigReadOptions`, and additionally expose `getZoomLevels(options?)`.
- **R5:** `BigWigReadOptions` must extend the foundation `ReadOptions` with an optional `resolution`. Omitting `resolution` must be equivalent to `{ mode: "unzoomed" }`.
- **R6:** `BigWigResolution` must be the discriminated union `{ mode: "unzoomed" } | { mode: "auto"; basesPerPixel: number } | { mode: "level"; reductionLevel: number }`.
- **R7:** Auto mode must require a finite `basesPerPixel` greater than zero. It must choose the available zoom level with the largest reduction level less than or equal to `basesPerPixel`. If no zoom level satisfies that condition, it must read unzoomed data. When `basesPerPixel` exceeds every available level, this rule naturally selects the coarsest available level.
- **R8:** Level mode must require a positive integer `reductionLevel` and must read exactly that available level. If the file does not declare that exact reduction level, the read must reject rather than substitute another level or use unzoomed data.
- **R9:** Auto selection is a target data resolution, not a hard result-count limit. The reader must not perform an additional caller-defined aggregation pass to force one result per pixel or cap the number of records.
- **R10:** `getZoomLevels(options?)` must asynchronously return all declared reduction levels as an ascending readonly number array. It must not expose zoom data offsets, index offsets, BBI headers, or other storage details.
- **R11:** `BigWigValueRecord` must have the flat shape `{ kind: "value", chromosome, start, end, value }`, where the coordinate fields satisfy `GenomicRecord`, `chromosome` equals the exact queried chromosome name resolved through the chromosome tree, and `value` is the decoded unzoomed signal value.
- **R12:** `BigWigSummaryRecord` must have the flat shape `{ kind: "summary", chromosome, start, end, validCount, min, max, sum, sumSquares, mean }`. `chromosome` must equal the exact queried chromosome name resolved through the chromosome tree. `validCount`, `min`, `max`, `sum`, and `sumSquares` must preserve the corresponding fields encoded in the zoom record. `mean` must be explicitly documented and computed as `sum / validCount`; it is convenience data and is not an additional stored BigWig statistic.
- **R13:** The reader must not fabricate zoom statistics for unzoomed records or collapse zoom summaries into value records. The `kind` discriminant must let callers distinguish stored source values from stored summaries.
- **R14:** Unzoomed decoding must support all three BigWig section encodings: bedGraph-style intervals, variable-step values, and fixed-step values. Generated coordinates and values must follow the section header's chromosome, start, end, item step, item span, type, and item count.
- **R15:** Zoom decoding must support the standard BigWig summary record layout and preserve every stored summary statistic without rounding, clamping, normalization, or omission. Floating-point fields must be decoded according to the file's detected byte order and returned as JavaScript numbers.
- **R16:** Both unzoomed and zoom reads must return only records whose chromosome ID equals the resolved query chromosome and whose source coordinates overlap the half-open query according to `record.start < region.end && record.end > region.start`.
- **R17:** Returned records must retain their decoded source coordinates. Reads must not clip records to the query, fill sparse gaps with zeroes, normalize chromosome names, deduplicate records, or synthesize intervals.
- **R18:** Final results must be stably sorted by `chromosome`, `start`, and `end`. Equal-key records and duplicate source records must retain source decode order.
- **R19:** An unknown chromosome or a valid query with no overlapping records must resolve to `[]` in every resolution mode.
- **R20:** Region validation must match the existing BigBed regional contract: non-numeric, non-finite, or non-integer coordinates reject with `TypeError`; negative coordinates or `start >= end` reject with `RangeError`.
- **R21:** Reading a non-BigWig BBI file through `createBigWigFile` or calling `getZoomLevels()` on it must reject with a clear ordinary error. Format validation remains lazy because factory creation performs no network work.
- **R22:** A native `AbortSignal` must cover all fetch and owned processing for `read()` and `getZoomLevels()`. Aborting one operation must not cancel a concurrent operation on the same file, native abort failures must be preserved, and cancellation checks must surround sequential fetch, decompression, and decode boundaries.
- **R23:** The file object must cache successfully loaded immutable metadata for its own lifetime: the common BBI header, zoom headers, chromosome lookup results including unknown chromosomes, and parsed R-tree headers keyed by the selected index. A new file object is the explicit way to refresh a changed URL.
- **R24:** Failed or aborted metadata work must not populate caches. Concurrent cache misses must preserve independent cancellation; duplicate work is acceptable instead of sharing an in-flight signal-bound promise. Index nodes, data blocks, decoded records, and regional results must remain uncached.
- **R25:** BigWig must reuse the private BBI family for common headers, chromosome lookup, regional-index traversal, block retrieval, decompression, range metadata, and safe offsets. BigWig-specific orchestration must own resolution selection and BigWig record decoding. The shared BBI layer must not select a zoom level or emit public BigWig records.
- **R26:** The private BBI layer must parse all declared zoom headers and allow regional traversal and block retrieval from either the unzoomed index or a selected zoom index. This capability must remain narrow and index-oriented rather than becoming a public or format-agnostic metadata framework.
- **R27:** Existing strict HTTP range, CORS compatibility, compression, unsigned 64-bit offset, unsigned 32-bit value, endian, bounded read-ahead, and browser-only dependency requirements from the BigBed reader must continue to apply to BigWig reads.
- **R28:** Ordinary network, decompression, bounds, and decode failures must propagate without a package-specific error hierarchy. The implementation must retain necessary structural checks but treat files as trusted rather than attempt exhaustive hostile-file validation.
- **R29:** Package documentation must describe creation, unzoomed reads, automatic selection, exact reduction-level selection, zoom-level discovery, both record shapes, the derivation of `mean`, cancellation, sparse results, and the distinction between target display resolution and a hard result cap.
- **R30:** Deterministic automated coverage must include a converter-generated BigWig with zoom data and committed source signal/chromosome-size inputs plus regeneration instructions. Compressed and uncompressed BBI block behavior must be covered, using separate fixtures when required by the converter.
- **R31:** Package verification must prove that the intended new runtime exports are present while private BBI and decoder modules remain unavailable from the package root.

## Technical Decisions

### Public API

The public contract is:

```ts
export type BigWigFileOptions = {
  url: string;
};

export type BigWigValueRecord = GenomicRecord & {
  kind: "value";
  value: number;
};

export type BigWigSummaryRecord = GenomicRecord & {
  kind: "summary";
  validCount: number;
  min: number;
  max: number;
  sum: number;
  sumSquares: number;
  mean: number;
};

export type BigWigRecord = BigWigValueRecord | BigWigSummaryRecord;

export type BigWigResolution =
  | { mode: "unzoomed" }
  | { mode: "auto"; basesPerPixel: number }
  | { mode: "level"; reductionLevel: number };

export type BigWigReadOptions = ReadOptions & {
  resolution?: BigWigResolution;
};

export interface BigWigFile extends GenomicFile<BigWigRecord> {
  read(region: GenomicRegion, options?: BigWigReadOptions): Promise<BigWigRecord[]>;
  getZoomLevels(options?: ReadOptions): Promise<readonly number[]>;
}

export function createBigWigFile(options: BigWigFileOptions): BigWigFile;
```

Reduction levels, unlike zoom-array indexes, have genomic meaning and are stable values callers can log or persist for reproducible reads. Explicit level selection is exact. Automatic selection is the only mode allowed to substitute among levels.

`basesPerPixel` is computed by a visual client as `(region.end - region.start) / viewportWidth`. Choosing the largest available reduction not exceeding that number avoids knowingly selecting source summaries coarser than a display pixel. File-defined summaries may be sparse or may not align with display pixels, so the returned record count is not promised to equal the viewport width.

### Record semantics

Unzoomed BigWig sections contain source signal values. Their interval coordinates come directly from bedGraph records or are generated from variable-step/fixed-step section metadata. The reader exposes these as `kind: "value"` without inventing summary fields.

Zoom blocks contain source summary records. The reader exposes their encoded `validCount`, `min`, `max`, `sum`, and `sumSquares` unchanged and adds only the clearly named derived `mean`. It does not alias the mean to `value`, because doing so would obscure the distinction between a source signal value and an aggregate. Callers rendering an envelope can use stored `min` and `max`; callers needing a central value can use `mean`.

Both record kinds emit the exact chromosome name supplied in the query after that name resolves through the file's chromosome tree. The reader does not invent a canonical name, reverse-map chromosome IDs, or apply aliases.

### Private BBI extension

The common BBI header remains shared. A focused private zoom-header operation reads the declared sequence of zoom headers and returns only the internal reduction level, data offset, and index offset needed by BigWig orchestration. Shared regional-index operations accept the selected index location rather than assuming the common header's unzoomed index offset. Parsed R-tree headers are cached by index identity on the file object.

The read path is:

```text
validate region and resolution
  → common BBI header and BigWig format validation
  → zoom headers when selection or discovery requires them
  → resolve unzoomed or exact zoom index
  → lazy chromosome lookup
  → selected regional R-tree traversal
  → matching compressed or uncompressed blocks
  → unzoomed section decoding or zoom summary decoding
  → chromosome/overlap filtering
  → stable sorting
```

The BBI family owns container navigation and bytes. BigWig owns the meaning of section types, summary records, public record construction, and resolution policy.

### Lifecycle and caching

Factory creation remains synchronous and request-free. Successful immutable metadata is cached per returned file object, matching the established BigBed lifetime. Zoom-level discovery and reads share common and zoom metadata, but each call retains its own signal and processing. A cache contains completed values, never an in-flight operation tied to one caller's signal.

## Verification Strategy

- Add compile-time and package-root tests for the complete public API, discriminated record union, specialized read options, structural `GenomicFile<BigWigRecord>` compatibility, and absence of private BBI exports.
- Add focused `BinaryReader` coverage for endian-aware 32-bit floating-point values and truncation behavior.
- Add focused unzoomed decoder tests for bedGraph, variable-step, and fixed-step sections in both byte orders, including coordinate generation, unsigned fields, overlap boundaries, neighboring chromosome records, truncation, stable order, and duplicate preservation.
- Add focused zoom-header and summary-decoder tests for both byte orders. Verify every encoded statistic, the derived mean, original coordinates, chromosome filtering, overlap filtering, and malformed/truncated input failures.
- Verify all resolution validation and selection boundaries: omitted/unzoomed behavior, invalid `basesPerPixel`, invalid reduction levels, no zoom levels, target finer than every level, exact equality, values between levels, target coarser than every level, and unavailable explicit levels.
- Verify `getZoomLevels()` returns ascending reduction levels, validates BigWig format lazily, supports cancellation, reuses successful metadata, and does not expose offsets.
- Exercise real regional reads through deterministic mocked HTTP range responses against converter-generated compressed and uncompressed fixtures. Compare unzoomed values and zoom summaries with trusted converter/tool output or independently inspected fixture expectations.
- Verify source-coordinate preservation, sparse `[]` behavior, sorting, duplicate preservation, unknown chromosomes, wrong-format rejection, and reads crossing data-block boundaries.
- Verify instance-local caches independently for common headers, zoom headers, chromosome results, and each selected index header. Confirm retries after failure/abort, no cache sharing between file objects, no caching of blocks/results, and cancellation isolation for concurrent calls.
- Re-run the existing BigBed BBI and integration tests to prove that selected-index support and zoom additions do not regress unzoomed BigBed behavior, request validation, compression, safe offsets, or bounded node read-ahead.
- Verify browser-compatible ESM output, declarations, sourcemaps, runtime dependency policy, package verification, README usage, and self-contained BigWig documentation.

## Out of Scope

- Migration of core BigWig, CAVE, or MethylC tracks from the external `genomic-reader` package.
- Adding viewport width, bases per pixel, cancellation, cache identity, or other context to core track fetchers.
- A hard result-count cap, one-record-per-pixel resampling, client-defined aggregation, or post-read downsampling in the reader.
- A factory-level default resolution or automatic behavior that depends on an implicit viewport width.
- Public BBI headers, offsets, indexes, data blocks, byte sources, or a generic BBI reader.
- BigBed zoom data, BigBed public API changes, AutoSQL interpretation, total-summary metadata, extra indexes, or non-regional BigWig queries.
- Local files, `Blob` inputs, authenticated requests, custom headers, custom `fetch`, filesystem access, FTP, or Node-specific APIs.
- Global URL caches, index-node caches, block caches, regional-result caches, speculative prefetching, or caller-visible cache controls.
- Exhaustive hostile-file validation, scientific interpretation of signal values, normalization, smoothing, missing-data imputation, chromosome aliases, coordinate conversion, clipping, or deduplication.

## Risks and Edge Cases

- BigWig zoom levels are generated when the file is built. Automatic selection can choose only among those levels and therefore cannot guarantee a result count or exact alignment with display pixels.
- Summary records are lossy relative to unzoomed values even though all stored summary statistics are exposed. Callers performing analyses that require source values must explicitly request unzoomed data.
- Returning a discriminated union is more explicit but requires consumers to handle value and summary records separately. This prevents silently treating an aggregate mean as an original measurement.
- Whole-chromosome unzoomed reads may return very large arrays. This remains an explicit caller choice; the reader must not silently switch resolution.
- Floating-point values preserve the precision represented in the file but may include ordinary IEEE-754 behavior when exposed as JavaScript numbers or when deriving `mean`.
- Existing BBI regional traversal assumes the unzoomed index in parts of its API. Generalizing that seam must remain narrow so shared BBI code does not accumulate BigWig resolution policy or regress BigBed caching.
- Converter-generated fixtures may not naturally exercise all three unzoomed section encodings or both byte orders. Focused synthetic decoder tests complement real end-to-end fixtures.
