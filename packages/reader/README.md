# @weng-lab/genomic-reader

Read BigWig signal, BigBed annotations, TwoBit reference DNA, chromosome sizes, and UCSC cytobands in browser applications.

## Install

```sh
npm install @weng-lab/genomic-reader@2.0.0 zod@4
```

Zod 4 is a peer dependency and supplies BigBed column schemas.

## Read a region

```ts
import { createBigWigFile } from "@weng-lab/genomic-reader";

const file = createBigWigFile({ url: "YOUR_URL_HERE" });
const records = await file.read({ chromosome: "chr1", start: 100_000, end: 101_000 });
```

Reuse the file object to retain loaded metadata. Binary readers require an HTTP server that supports byte ranges and permits browser access through CORS.

## Documentation

- [Documentation overview](docs/README.md)
- [API reference and complete export index](docs/reference/README.md)

Only the package root is public. Byte-range transport, binary indexes, and decoders are internal.
