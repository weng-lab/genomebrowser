# UCSC BAM example

Downloaded 2026-09-23 from the user-supplied UCSC examples:

- https://genome.ucsc.edu/goldenPath/help/examples/bamExample.bam
- https://genome.ucsc.edu/goldenPath/help/examples/bamExample.bam.bai

The files are unmodified. Tests serve them through a mocked HTTP range endpoint and do not require network access. The example uses reference name `21`, not `chr21`.

SHA-256:

- BAM: `3a85cb0cbf1e976e81650ac45a838f154d9e764c6feb219cebfad3ece25d2700`
- BAI: `4bd36227991881be5844d1df2f8e37ff33b0e1cb2a488765c7808feffe77167c`

The live UCSC BAM endpoint returned `Content-Encoding: x-gzip` during verification. The reader rejects transport-encoded ranges; the fixture endpoint serves original bytes without transport encoding.
