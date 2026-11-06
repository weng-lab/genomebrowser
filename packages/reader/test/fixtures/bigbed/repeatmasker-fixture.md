# RepeatMasker test fixture

`repeatmasker.bb` is a synthetic uncompressed BED6+11 BBI fixture containing the records in `repeatmasker.bed` and embedded `repeatmasker.as`. It has a chr1 chromosome tree, one primary R-tree leaf, and one 1000-base zoom level (coverage: 1800 bases; sum: 1980; mean: 1.1). Padding separates metadata, raw records, and zoom data so tests can reject unzoomed reads in large-window queries. It contains no downloaded genomic data.
