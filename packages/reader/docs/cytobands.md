# UCSC cytobands

Use `readCytobands` to fetch a plain-text or gzip-compressed UCSC cytoband file. Use
`parseCytobands` when you already have its decoded text. Both functions return immutable cytoband
records in source order.

## Usage

```ts
import { readCytobands } from "@weng-lab/genomic-reader";

const cytobands = await readCytobands({
  url: "YOUR_URL_HERE",
});
```

The reader detects gzip data from the bytes at the start of the response. The URL does not need a
`.gz` suffix, and the response does not need a particular content type.

## Parse existing text

```ts
import { parseCytobands } from "@weng-lab/genomic-reader";

const cytobands = parseCytobands("chr1\t0\t2300000\tp36.33\tgneg\n");
```

Each result has normalized genomic field names while preserving the band name and stain text:

```ts
{
  chromosome: "chr1",
  start: 0,
  end: 2_300_000,
  name: "p36.33",
  stain: "gneg",
}
```

## File rules

Each non-empty line must contain exactly five tab-separated UCSC fields, in this order:
chromosome, start, end, band name, and stain. Blank lines are ignored. Text with no records returns
an empty immutable list.

Coordinates must be safe non-negative integers, and `start` must be less than `end`. They use the
UCSC zero-based, half-open convention. All five fields must be present. Chromosome, coordinate, and
stain fields must be non-empty. UCSC uses an empty band name for some alternate sequences, which
the parser preserves. The parser does not interpret or normalize stain values; values such as
`gneg`, `gpos75`, and `acen` remain unchanged. Records are not reordered.

## Cancellation and errors

Pass an `AbortSignal` to cancel a network read:

```ts
const controller = new AbortController();
const promise = readCytobands({
  url: "YOUR_URL_HERE",
  signal: controller.signal,
});

controller.abort();
await promise;
```

`readCytobands` rejects for invalid or non-HTTP(S) URLs, cancelled requests, network failures,
non-successful HTTP responses, invalid gzip data, and invalid file contents. `parseCytobands`
throws for non-text input, malformed rows, and invalid coordinates. For cross-origin URLs, the
server must allow the browser to fetch the file through CORS.

## API

```ts
type Cytoband = {
  readonly chromosome: string;
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly stain: string;
};

type ReadCytobandsOptions = {
  url: string;
  signal?: AbortSignal;
};

function parseCytobands(text: string): readonly Cytoband[];
function readCytobands(options: ReadCytobandsOptions): Promise<readonly Cytoband[]>;
```
