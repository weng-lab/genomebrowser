# ClinGen hg38 regional fixtures

These are source-derived BRCA1 records captured on 2026-11-17 from UCSC's four hg38 BigBed files in https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/ . The original AutoSQL declarations and tab-separated BED rows are included beside each `.bb`.

The capture queried chr17:43000000-43200000 through the public BigBed reader with a BED3 schema. This preserves each complete interval and every original trailing field: one haplo record, one triplo record, two gene-disease records, and one VCEP record. Nothing was clipped or relabeled. `chrom.sizes` uses the hg38 chr17 length, 83,257,441 bases. All BED coordinates are zero-based, half-open.

Rebuild with UCSC's `bedToBigBed` (https://hgdownload.soe.ucsc.edu/admin/exe/linux.x86_64/bedToBigBed):

```sh
bedToBigBed -tab -type=bed9+17 -as=clinGenHaplo.as clinGenHaplo.bed chrom.sizes clinGenHaplo.bb
bedToBigBed -tab -type=bed9+17 -as=clinGenTriplo.as clinGenTriplo.bed chrom.sizes clinGenTriplo.bb
bedToBigBed -tab -type=bed9+9 -as=clinGenGeneDisease.as clinGenGeneDisease.bed chrom.sizes clinGenGeneDisease.bb
bedToBigBed -tab -type=bed9+3 -as=clinGenCspec.as clinGenCspec.bed chrom.sizes clinGenCspec.bb
```

Tests serve these real binary fixtures with byte-range responses. Unsafe HTML and offscreen records are explicit synthetic mutations of decoded fixture data in the interaction/layout tests, never demo data.
