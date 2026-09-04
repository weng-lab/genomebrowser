# @weng-lab/genomic-reader

Read chromosome-size definitions, UCSC cytobands, BigWig signal values, and BigBed records in
browser applications.

## Install

Install the package and its Zod 4 peer dependency:

```sh
npm install @weng-lab/genomic-reader@beta zod
```

## Read chromosome sizes

Read a public `chrom.sizes` text file into a map that can be used to define an assembly:

```ts
import { readChromSizes } from "@weng-lab/genomic-reader";

const chromosomes = await readChromSizes({ url: "YOUR_URL_HERE" });
```

Every valid row is retained, including mitochondrial, alternate, patch, decoy, and unplaced
sequences. The reader does not infer biological meaning from sequence names. See
[`docs/chrom-sizes.md`](docs/chrom-sizes.md) for parsing rules, cancellation, and errors.

## Read UCSC cytobands

Read a plain UTF-8 or gzip-compressed UCSC cytoband file into immutable records:

```ts
import { readCytobands } from "@weng-lab/genomic-reader";

const cytobands = await readCytobands({ url: "YOUR_URL_HERE" });
```

The reader detects gzip from the response bytes and preserves each source stain string and record
order. See [`docs/cytobands.md`](docs/cytobands.md) for the five-field format, coordinates,
cancellation, and errors.

## Read a BigWig file

Create a file synchronously, then read source signal values for a region:

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const records = await file.read({
  chromosome: "chr1",
  start: 100_000,
  end: 101_000,
});
```

BigWig files can also contain lossy zoom summaries for wider views. A reduction level is a
file-declared genomic summary scale measured in bases; larger levels are coarser. Sparse data and
summary boundaries mean records need not each span exactly that many bases. Discover the available
levels, then read summaries from one of them:

```ts
const region = { chromosome: "chr1", start: 0, end: 1_000_000 };

const zoomLevels = await file.getZoomLevels();
const coarsestLevel = zoomLevels.at(-1);

if (coarsestLevel !== undefined) {
  const displayRecords = await file.readZoomLevel(region, coarsestLevel);
}
```

Value and summary records use a `kind` discriminant. Summaries expose every stored statistic plus a
derived `mean`; they are not source measurements. See [`docs/bigwig.md`](docs/bigwig.md) for exact
selection, record shapes, cancellation, regional behavior, server prerequisites, and errors.

## Read a BigBed file

Create a file synchronously, then perform an asynchronous regional read. Invalid factory options,
URLs, or schemas throw before a file is returned; file and record failures are checked by `read()`:

```ts
import { bed3Schema, createBigBedFile } from "@weng-lab/genomic-reader";

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: bed3Schema,
});

const records = await file.read({ chromosome: "chr1", start: 100_000, end: 101_000 });
```

`bed3Schema` consumes no columns after BED3. Each result therefore has this inferred shape:

```ts
{
  chromosome: string;
  start: number;
  end: number;
  fields: string[];
}
```

`fields` contains every source column after chromosome, start, and end, in source order. It is an
empty array for a BED3 record.

For named and typed columns, pass a regular `z.object` schema. Each declared property parser
consumes exactly one post-BED3 source column in declaration order. Any columns left after the last
declared property become `fields`:

```ts
import { createBigBedFile } from "@weng-lab/genomic-reader";
import { z } from "zod";

const ccreSchema = z.object({
  accession: z.string(), // fourth BED column
  score: z.coerce.number(), // fifth BED column: source text parsed as a number
  strand: z.string(), // sixth BED column
});

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: ccreSchema,
});

const records = await file.read({ chromosome: "chr1", start: 100_000, end: 101_000 });
// Inferred item type:
// { chromosome: string; start: number; end: number;
//   accession: string; score: number; strand: string; fields: string[] }
```

The reader protects `chromosome`, `start`, `end`, and `fields`; do not declare those names in the
schema. Remaining, unconsumed columns are always returned in `fields`. See
[`docs/bigbed.md`](docs/bigbed.md) for schema details, regional behavior, server prerequisites, and
errors.

For both formats, the server must support `206 Partial Content` byte-range responses. Exposing
`Content-Range` with a numeric complete file size is optional, but enables the reader to traverse
the file's index with fewer requests. Reads remain supported when that size is hidden or reported
as `*`.

## Use the format-independent contract

Use `GenomicFile<T>` when your code can work with any regional genomic file:

```ts
import type { GenomicFile, GenomicRecord, GenomicRegion } from "@weng-lab/genomic-reader";

type NamedRecord = GenomicRecord & {
  name: string;
};

export async function readNames(
  file: GenomicFile<NamedRecord>,
  region: GenomicRegion,
  signal?: AbortSignal,
) {
  const records = await file.read(region, { signal });
  return records.map((record) => record.name);
}
```

Coordinates are zero-based and half-open. A successful read returns records that overlap the
requested chromosome and interval. Because one read targets one chromosome, results are sorted by
start and then end; equal coordinates retain source order. Records retain their decoded coordinates
and format-specific fields.

Each signal applies only to its read. A successful, valid read returns `[]` only when the chromosome
is unknown or no records overlap. `read()` asynchronously rejects for invalid regions, aborts, HTTP
range or network failures, binary decode or decompression failures, and schema failures; the reader
never returns partial results for these failures.

## Public API

- `readChromSizes({ url, signal? })`: fetches and parses a public HTTP(S) `chrom.sizes` file.
- `parseChromSizes(text)`: parses `chrom.sizes` text without fetching it.
- `ChromSizes`: an immutable map from sequence names to positive integer lengths.
- `ReadChromSizesOptions`: the URL and optional abort signal accepted by `readChromSizes`.
- `readCytobands({ url, signal? })`: fetches and parses plain UTF-8 or gzip-compressed UCSC cytoband
  data.
- `parseCytobands(text)`: parses five-field UCSC cytoband text without fetching it.
- `Cytoband`: an immutable band record containing chromosome, zero-based half-open coordinates,
  band name, and unchanged stain string.
- `ReadCytobandsOptions`: the URL and optional abort signal accepted by `readCytobands`.
- `createBigWigFile({ url })`: synchronously configures a BigWig file without making a request. Its
  `read()` method returns source values, its `readZoomLevel()` method returns stored zoom summaries
  for an exact declared reduction level, and its `getZoomLevels()` method discovers the available
  reduction levels.
- `BigWigFileOptions` and `BigWigFile`: BigWig factory and file contracts.
- `BigWigRecord`, `BigWigValueRecord`, and `BigWigSummaryRecord`: the discriminated BigWig result
  types.
- `createBigBedFile({ url, schema })`: synchronously configures a BigBed file. It performs no network
  request until `read()` and privately caches successful file-header, chromosome, and primary-index
  header metadata for that file object.
- `bed3Schema`: a Zod object schema that consumes zero post-BED3 fields.
- `BigBedFileOptions<Schema>`: factory options for the public HTTP(S) URL and positional Zod schema.
- `GenomicRegion`: a chromosome and zero-based, half-open `start` and `end` interval.
- `GenomicRecord`: the required `chromosome`, `start`, and `end` fields for returned records.
- `ReadOptions`: optional per-read native `AbortSignal` configuration.
- `GenomicFile<T>`: a structural interface with `read(region, options?) => Promise<T[]>`, where `T`
  extends `GenomicRecord`.

Only the package root is public. Internal byte-range, BBI, index, and decoder modules are not
exported.
