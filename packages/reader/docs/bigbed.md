# Read BigBed files

Use `createBigBedFile` to read indexed records from a public HTTP(S) BigBed file without downloading
the whole file. The factory uses a Zod schema to name and parse positional columns after BED3.

## Install

Zod 4 is a peer dependency because your schema crosses the package API boundary. Install both
packages:

```sh
npm install @weng-lab/genomic-reader@alpha "zod@^4"
```

## Start with BED3

`bed3Schema` works with BED3 and wider BigBed records:

```ts
import { bed3Schema, createBigBedFile } from "@weng-lab/genomic-reader";

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: bed3Schema,
});

const records = await file.read({
  chromosome: "chr1",
  start: 100_000,
  end: 101_000,
});
```

Each record contains the protected BED3 coordinates and an array of source columns after BED3:

```ts
type Result = {
  chromosome: string;
  start: number;
  end: number;
  fields: string[];
};
```

`fields` preserves column order and empty columns. A BED3 record has `fields: []`.

## Parse positional fields with Zod

Pass a regular `z.object` when you want named, typed properties. Each declared property parser
consumes exactly one post-BED3 source column, following object property declaration order. Property
names do not come from the BigBed file. Any source columns left after the last declared property are
returned in `fields`.

For example, given cCRE-like BED6 rows:

```text
chr1  100000  100250  EH38E000001  750  +
```

declare the three post-BED3 fields in the same order:

```ts
import { createBigBedFile } from "@weng-lab/genomic-reader";
import { z } from "zod";

const ccreSchema = z.object({
  accession: z.string(),
  score: z.coerce.number(),
  strand: z.string(),
});

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: ccreSchema,
});

const [record] = await file.read({
  chromosome: "chr1",
  start: 100_000,
  end: 100_001,
});
```

The inferred result is flat:

```ts
type Result = {
  chromosome: string;
  start: number;
  end: number;
  accession: string;
  score: number;
  strand: string;
  fields: string[];
};
```

BigBed payload values begin as text. Use `z.coerce.number()` when a numeric source column should
become a number. Regular property-level Zod parsing, coercion, transforms, and asynchronous
transforms or refinements are supported. Properties are parsed sequentially.

Each property parser receives one source string. If a record has fewer source columns than declared
properties, the complete read rejects with a `z.ZodError`; optional properties and defaults do not
make a missing source column optional or invent one. Extra source columns are not unknown object
keys, even with `z.strictObject`; they remain unparsed in `fields`.

The reader owns and protects `chromosome`, `start`, `end`, and `fields`, so a schema cannot declare
those names. It also rejects integer-index-like property names because JavaScript enumerates them
out of declaration order. Use a normal stripping object (`z.object`), `z.strictObject`, or an
explicit `z.never()` catchall. Loose, passthrough, value-producing catchall, object-level transform,
wrapped, and object-level refined schemas are not supported. These restrictions keep positional
mapping and the inferred output shape consistent.

## Regions, results, and cancellation

Coordinates are zero-based and half-open. A result overlaps a query when its start is before the
query end and its end is after the query start. Records keep their original coordinates; the reader
does not clip or deduplicate them. Because one read targets one chromosome, results are stably
sorted by start and then end; source records with equal coordinates keep their source order.

Unknown chromosomes and valid regions with no overlapping records resolve to `[]`. Invalid
coordinates reject: coordinates must be finite nonnegative integers, and `start` must be less than
`end`.

Pass a native `AbortSignal` to cancel one read:

```ts
import { bed3Schema, createBigBedFile } from "@weng-lab/genomic-reader";

const file = createBigBedFile({
  url: "YOUR_URL_HERE",
  schema: bed3Schema,
});
const controller = new AbortController();

const pendingRecords = file.read(
  { chromosome: "chr1", start: 100_000, end: 101_000 },
  { signal: controller.signal },
);

controller.abort();
await pendingRecords;
```

Abort failures retain the native abort reason. Each signal applies only to its read, including when
the same file object has concurrent reads.

## HTTP server requirements

The URL must be an absolute public `http:` or `https:` URL. Authenticated requests, custom request
headers, and custom `fetch` implementations are not supported.

The host must support exact byte-range requests and return `206 Partial Content`. For browser use,
its CORS policy must allow your application to fetch the file and must expose `Content-Range` to
JavaScript, typically with:

```http
Access-Control-Allow-Origin: https://your-application.example
Access-Control-Expose-Headers: Content-Range
```

The reader rejects servers or intermediaries that return `200 OK`, omit or hide `Content-Range`,
return different or incorrectly sized byte ranges, or apply transport `Content-Encoding`.

## Lifecycle and failures

Creating a file is synchronous and performs no request. Invalid factory options, URLs, and schemas
throw synchronously before a file is returned. File contents and record compatibility are not
checked until `read()`.

Every `read()` is stateless and uncached: it fetches the metadata, index nodes, and data blocks
needed for that read again. Reusing a file object is convenient but does not create a cache.

Ordinary no-data cases return `[]`. Once a file exists, `read()` asynchronously rejects for invalid
regions, network and HTTP contract failures, aborts, incompatible files, binary decode errors,
decompression errors, and Zod parsing failures. These failures never become empty or partial
results. The package does not wrap them in a package-specific error class.
