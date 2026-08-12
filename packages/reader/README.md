# @weng-lab/genomic-reader

TypeScript contracts for reading sparse genomic records by region.

The package defines a format-independent interface. Concrete format readers are not included yet.

## Usage

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
requested chromosome and interval, sorted by chromosome, start, and end. Records retain their
decoded coordinates and format-specific fields.

Each signal applies only to its read. Unknown chromosomes and regions without records return an
empty array.

## API

- `GenomicRegion`: a chromosome and zero-based, half-open `start` and `end` interval.
- `GenomicRecord`: the required `chromosome`, `start`, and `end` fields for returned records.
- `ReadOptions`: optional per-read native `AbortSignal` configuration.
- `GenomicFile<T>`: a structural interface with `read(region, options?) => Promise<T[]>`, where `T`
  extends `GenomicRecord`.
