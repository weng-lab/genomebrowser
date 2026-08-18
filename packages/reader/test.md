Design a new BBI-family reader spec for `@weng-lab/genomic-reader`, using `.specs/genomic-reader-foundation/spec.md` as the authoritative public API foundation. Begin with design discussion and questions; do not write the spec yet.

The first concrete format is BigBed. Shared BBI internals should later support BigWig without forcing BBI concepts into the public API. BigGenePred is a BigBed schema—BED12 plus eight fields—not a separate binary container.

Public usage should eventually resemble:

```ts
const file = createBigBedFile({ url: "YOUR_URL_HERE" });
const records = await file.read(region, { signal });
```

Important decisions already established:

- Factories are synchronous, format-specific, and always accept options objects.
- File creation performs no network request.
- Reads are stateless and uncached initially.
- Results are sparse, flat, coordinate-bearing records using `chromosome`, `start`, and `end`.
- Coordinates are zero-based and half-open.
- Return original decoded data without clipping, normalization, or source-record deduplication.
- Sort results by chromosome, start, and end.
- Unknown chromosomes and no-data regions return `[]`.
- Preserve native cancellation and ordinary network/decode failures; avoid a package error hierarchy.
- Treat files as trusted. Keep necessary binary bounds and HTTP safety, but avoid exhaustive malformed-file validation and speculative security machinery.
- Use browser-native APIs only: no React, core dependency, Axios, Node `Buffer`, filesystem, or streams.
- Prefer a few real or converter-generated fixtures and observable regional reads over exhaustive synthetic malformed-binary tests.
- Remote inputs are initially public, CORS-enabled HTTP(S) URLs.

Architecturally, separate shared BBI concerns—range access, endian parsing, common headers, chromosome lookup, regional indexes, compression, and block retrieval—from BigBed record decoding. Do not create a broad abstraction spanning unrelated formats such as GTF/Tabix.

Inspect `~/Dev/gb-api/track/bigdata` as an organizational and behavioral reference only; its repository has no discovered license, so do not copy code. Preserve the useful shared “big data” organization, but avoid its eager whole-metadata/tree loading, permissive range handling, and API/server-specific design.

First help me settle the simplest BBI and BigBed boundaries, public BigBed result/parser API, and verification fixtures. Ask a few related questions at a time until we share the design.
